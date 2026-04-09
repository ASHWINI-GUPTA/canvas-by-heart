require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');

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

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing in env vars. Database queries will fail.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

app.get('/api/items', async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('gallery_media')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(items || []);
  } catch (error) {
    console.error('Fetch items error:', error);
    res.status(500).json({ error: error.message });
  }
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
    const order = parseInt(req.body.order, 10) || 0;
    
    // Insert to Supabase
    const { error: dbError } = await supabase
      .from('gallery_media')
      .insert([{ id, title, image_url: publicUrl, type, status: 'active', order }]);

    if (dbError) throw dbError;

    res.json({ success: true, id, title, image_url: publicUrl, type, order });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/items/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Fetch item to get url
    const { data: itemData, error: fetchErr } = await supabase
      .from('gallery_media')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !itemData) return res.status(404).json({ error: 'Item not found' });

    const urlParts = itemData.image_url.split('/');
    const filename = urlParts[urlParts.length - 1];

    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename
      }));
    } catch (e) {
      console.warn("Failed to delete from R2 (maybe already gone):", e);
    }

    // Soft delete from Supabase
    const { error: delErr } = await supabase
      .from('gallery_media')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (delErr) throw delErr;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/items/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const { title, order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const updateData = { title };
    if (order !== undefined) {
      updateData.order = parseInt(order, 10) || 0;
    }

    const { data, error: updateErr } = await supabase
      .from('gallery_media')
      .update(updateData)
      .eq('id', id)
      .eq('status', 'active')
      .select();

    if (updateErr) throw updateErr;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Item not found' });

    res.json({ success: true, id, ...updateData });
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

    const { data: existingItems, error: fetchErr } = await supabase.from('gallery_media').select('id');
    if (fetchErr) throw fetchErr;

    const existingIds = (existingItems || []).map(item => item.id);

    for (const obj of objects) {
      if (obj.Key.endsWith('/')) continue; // skip directory markers
      const key = obj.Key;
      const parts = key.split('/');
      const filename = parts[parts.length - 1];
      const id = filename.split('.')[0];
      const ext = filename.split(".")[1] || "";

      let type = 'image';
      let folder = "images";
      if (key.startsWith('videos/')) {
        folder = 'videos';
        type = 'video';
      } else if (filename.match(/\.(mp4|webm|mov|ogg)$/i)) {
        folder = 'videos';
        type = 'video'; // fallback
      }

      const publicUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${key}`
        : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;

      if (!existingIds.includes(id)) {
        const { error: insertErr } = await supabase
          .from('gallery_media')
          .insert([{ id: id, title: 'Imported from R2', image_url: publicUrl, type, status: 'active' }]);
          
        if (insertErr) {
          console.error("Sync insert error for id", id, ": ", insertErr);
        } else {
          addedCount++;
        }
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
