# Canvas by Heart Website

Welcome to the project repository for **Canvas by Heart**! 

This application has been upgraded from a static HTML website to a fully dynamic web application powered by a Node.js backend. It features an integrated Cloudflare R2 object storage setup for rich media management and a lightweight SQLite database for blazing-fast gallery lookups.

## 🚀 Features

- **Dynamic Media Gallery:** The frontend automatically pulls image and video listings from the backend REST API.
- **Video & Image Support Native Players:** Effortlessly upload mixing image types and videos (MP4, WebM, etc.). The lightbox dynamically swaps between image tags and interactive video players.
- **Admin Dashboard UI:** A secure login portal to manage your art gallery directly from the website.
- **Cloudflare R2 Integration:** Highly secure and performant integration to directly push large media files into the cloud natively from the admin dashboard using S3 commands.
- **SQLite Database:** A minimal, server-less database footprint ensuring lightning-fast website load speeds.
- **R2 Sync Utility:** Added peace of mind. Easily rebuild your SQLite database paths securely by fetching a list of current R2 bucket nodes gracefully.

---

## 🛠️ Setup Instructions

Follow these steps to run the application locally or on a server.

### Prerequisites
- [Node.js](https://nodejs.org/en) (v18.x or above recommended)
- A Cloudflare account with **R2 Object Storage** enabled and an empty bucket created.

### 1. Installation

Clone this repository and open the integrated terminal folder.

```bash
npm install
```
This will install all necessary packages including `express`, `multer`, `sqlite3`, `jsonwebtoken`, and AWS S3 SDK wrappers used for Cloudflare R2.

### 2. Environment Variables Integration

The backend relies on key environment variables to keep your credentials safe. 
1. Make a copy of the provided template: `cp .env.example .env` (or manually rename `.env.example` to `.env`).
2. Open `.env` and completely fill in the blanks:

```dotenv
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key"
R2_SECRET_ACCESS_KEY="your-r2-secret-key"
R2_BUCKET_NAME="canvas-bucket-name"
# Ensure your R2 Bucket has a "Public Custom Domain" or an active "r2.dev" subdomain enabled.
R2_PUBLIC_URL="https://pub-abc123xyz.r2.dev"

ADMIN_USER="admin"
ADMIN_PASSWORD="super-secret-password"
JWT_SECRET="generate-a-long-random-string-here"
PORT=3000
```

### 3. Run the App

Start the Express Node.js Server:

```bash
node server.js
```
* **Frontend Application** will be natively served at: `http://localhost:3000`
* **Studio Dashboard** is locked at: `http://localhost:3000/studio`

---

## 🖼️ Managing Gallery Images & Videos

Everything is now managed dynamically via your studio dashboard!

1. Navigate to your app URL `/studio` (e.g. `http://localhost:3000/studio`).
2. Log in with the `ADMIN_USER` and `ADMIN_PASSWORD` you provided in `.env`.
3. In the upload card:
   - Provide your painting's title.
   - Choose the file. Our app automatically detects if your selection is a static image or a video.
   - Press **Upload to R2**. 
4. The backend securely funnels this picture over to Cloudflare R2 grouping them seamlessly into your bucket under an `images/` or `videos/` folder.
5. Head over back to `http://localhost:3000/` and see your newest item inserted directly onto the canvas display!

> **Having Database Issues?** Just navigate back to the `/studio` screen and smash the "Sync from R2" button! The system searches your bucket and maps all known nodes backward into the SQLite database flawlessly.
