// ✅ FIX: path dotenv sebelumnya terbalik — local load production, production load local
require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.local'
});

// 🚧 DEV MODE: Skip load email job worker jika DISABLE_QUEUE=true
// Ini mencegah Bull Queue connect ke Upstash dan spam polling
if (process.env.DISABLE_QUEUE !== 'true') {
  require('./jobs/email.job');
} else {
  console.log('📭 [DEV MODE] Email job worker dinonaktifkan (DISABLE_QUEUE=true)');
}

const express = require('express');

const app = express();
// Minta Express untuk mempercayai header X-Forwarded-For dari Reverse Proxy (Nginx/GCP)
// Ini sangat penting agar Rate Limiter mendeteksi IP Client asli, bukan IP Proxy.
app.set('trust proxy', 1);

// ================= MIDDLEWARE =================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const { errorHandler } = require('./middlewares/error.middleware');

// ================= CORS FOR API DOCS / WEB CLIENTS =================
const corsOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowAllOrigins = corsOrigins.includes('*');

  if (origin && (allowAllOrigins || corsOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', allowAllOrigins ? '*' : origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ================= HEALTH CHECK =================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'acaris-auth',
    timestamp: new Date().toISOString()
  });
});

// ================= ROUTES =================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Menyajikan folder uploads secara statis di VPS untuk foto profil jika STORAGE_TYPE=local
const path = require('path');
app.use('/uploads', express.static(path.resolve('/app/uploads')));

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
