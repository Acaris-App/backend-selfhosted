// ✅ FIX: path dotenv sebelumnya terbalik — local load production, production load local
require('dotenv').config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.local'
});

const express = require('express');

const app = express();

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
    service: 'acaris-consultation',
    timestamp: new Date().toISOString()
  });
});

// ================= ROUTES =================
const scheduleRoutes = require('./routes/schedule.routes');
const dosenRoutes = require('./routes/dosen.routes');
const mahasiswaRoutes = require('./routes/mahasiswa.routes');

app.use('/schedule', scheduleRoutes);
app.use('/dosen', dosenRoutes);
app.use('/mahasiswa', mahasiswaRoutes);

// ================= ERROR HANDLER =================
app.use(errorHandler);

// ================= START SERVER =================
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
