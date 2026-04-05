require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const multer = require('multer');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve the main app
app.use(express.static(path.join(__dirname, '.')));
// Serve the admin app explicitly as /studio
app.use('/studio', express.static(path.join(__dirname, 'studio')));

// Admin Auth Variables
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// Database setup
const db = new Database('database.sqlite');
db.prepare(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    title TEXT,
    image_url TEXT,
    type TEXT DEFAULT 'image',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

try {
  db.prepare('ALTER TABLE items ADD COLUMN type TEXT DEFAULT "image"').run();
} catch (e) {
  // Column already exists
}

// S3 / R2 Setup
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

if (!process.env.R2_ACCOUNT_ID) {
  console.warn("WARNING: R2 credentials not found in env vars.");
}

const upload = multer({ storage: multer.memoryStorage() });

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- API Endpoints ---

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'I\'m alive 🙂, thanks for asking!', timestamp: new Date().toISOString() });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/items', (req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  res.json(items);
});

app.post('/api/items', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Media file required' });

    const ext = path.extname(req.file.originalname) || '';
    const id = crypto.randomUUID();
    const contentType = req.file.mimetype;

    let folder = 'images';
    let type = 'image';
    if (contentType.startsWith('video/')) {
      folder = 'videos';
      type = 'video';
    }

    const filename = `${folder}/${id}${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: req.file.buffer,
      ContentType: contentType,
    }));

    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${filename}`
      : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${filename}`;

    const title = req.body.title || 'Untitled';
    db.prepare('INSERT INTO items (id, title, image_url, type) VALUES (?, ?, ?, ?)').run(id, title, publicUrl, type);

    res.json({ success: true, id, title, image_url: publicUrl, type });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/items/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const urlParts = item.image_url.split('/');
    const filename = urlParts[urlParts.length - 1];

    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename
      }));
    } catch (e) {
      console.warn("Failed to delete from R2 (maybe already gone):", e);
    }

    db.prepare('DELETE FROM items WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/items/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = db.prepare('UPDATE items SET title = ? WHERE id = ?').run(title, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });

    res.json({ success: true, id, title });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sync', authenticate, async (req, res) => {
  try {
    const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
    const response = await s3.send(command);

    const objects = response.Contents || [];
    let addedCount = 0;

    const existingItems = db.prepare('SELECT * FROM items').all();
    const existingIds = existingItems.map(item => item.id);

    for (const obj of objects) {
      if (obj.Key.endsWith('/')) continue; // skip directory markers
      const key = obj.Key;
      const parts = key.split('/');
      const filename = parts[parts.length - 1];
      const id = filename.split('.')[0];

      let type = 'image';
      if (key.startsWith('videos/')) {
        type = 'video';
      } else if (filename.match(/\.(mp4|webm|mov|ogg)$/i)) {
        type = 'video'; // fallback
      }

      const publicUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${key}`
        : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

      if (!existingIds.includes(id)) {
        db.prepare('INSERT INTO items (id, title, image_url, type) VALUES (?, ?, ?, ?)')
          .run(id, 'Imported from R2', publicUrl, type);
        addedCount++;
      }
    }

    res.json({ success: true, added: addedCount });
  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
