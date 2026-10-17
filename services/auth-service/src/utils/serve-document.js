const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const DOCS_ROOT = path.resolve('/app/uploads/documents');
const UPLOADS_ROOT = path.resolve('/app/uploads');
const SAFE_NAME = /^[\w.-]+\.pdf$/i;

function extractNpm(filename) {
  // "2255061008_khs_sem1.pdf" -> "2255061008"
  const m = String(filename || '').match(/^(\d+)_/);
  return m ? m[1] : null;
}

/**
 * Express handler: GET /uploads/documents/:filename
 * Akses:
 * - Admin: Full access
 * - System (n8n callback secret): Full access
 * - Dosen: Full access ke dokumen akademik mahasiswa
 * - Mahasiswa: Hanya dokumen miliknya sendiri (NPM cocok atau user_id cocok di DB)
 * - Anonim: Ditolak 401 oleh authenticate middleware
 */
async function serveAcademicDocument(req, res) {
  try {
    const filename = req.params.filename || req.params[0];
    const user = req.user;

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Token tidak ditemukan' });
    }

    if (!filename || !SAFE_NAME.test(filename)) {
      return res.status(400).json({ status: 'error', message: 'Nama file tidak valid' });
    }

    // Path traversal check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ status: 'error', message: 'Nama file tidak valid' });
    }

    // Cek file di /app/uploads/documents/:filename
    let filePath = path.join(DOCS_ROOT, filename);
    let fileExists = filePath.startsWith(DOCS_ROOT) && fs.existsSync(filePath);

    // Fallback: cek di /app/uploads/:userId/:filename jika param userId ada
    if (!fileExists && req.params.userId) {
      const userFolder = String(req.params.userId).replace(/[^a-zA-Z0-9_-]/g, '');
      const userDir = path.join(UPLOADS_ROOT, userFolder);
      filePath = path.join(userDir, filename);
      fileExists = filePath.startsWith(UPLOADS_ROOT) && fs.existsSync(filePath);
    }

    // Fallback kedua: langsung di /app/uploads/:filename
    if (!fileExists) {
      const directPath = path.join(UPLOADS_ROOT, filename);
      if (directPath.startsWith(UPLOADS_ROOT) && fs.existsSync(directPath)) {
        filePath = directPath;
        fileExists = true;
      }
    }

    if (!fileExists) {
      return res.status(404).json({ status: 'error', message: 'File tidak ditemukan' });
    }

    // System (n8n) & Admin: Full access
    if (user.role === 'admin' || user.role === 'system') {
      res.setHeader('Content-Type', 'application/pdf');
      return res.sendFile(filePath);
    }

    // Dosen: Akses ke seluruh dokumen akademik bimbingan/mahasiswa
    if (user.role === 'dosen') {
      res.setHeader('Content-Type', 'application/pdf');
      return res.sendFile(filePath);
    }

    // Mahasiswa: Hanya dokumen miliknya sendiri
    if (user.role === 'mahasiswa') {
      let userNpm = user.npm_nip;
      if (!userNpm && user.id) {
        try {
          const userRow = await db.query('SELECT npm_nip FROM users WHERE id = $1', [user.id]);
          if (userRow.rows.length > 0) {
            userNpm = userRow.rows[0].npm_nip;
            req.user.npm_nip = userNpm;
          }
        } catch (dbErr) {
          console.error('[serveAcademicDocument] Error fetching user NPM:', dbErr.message);
        }
      }

      // 1. Cek prefix NPM pada nama file (e.g. 2255061008_transkrip.pdf)
      const fileNpm = extractNpm(filename);
      if (fileNpm && userNpm && String(userNpm) === String(fileNpm)) {
        res.setHeader('Content-Type', 'application/pdf');
        return res.sendFile(filePath);
      }

      // 2. Cek apakah file berada di direktori userId mahasiswa
      if (req.params.userId && String(req.params.userId) === String(user.id)) {
        res.setHeader('Content-Type', 'application/pdf');
        return res.sendFile(filePath);
      }

      // 3. Cek kepemilikan di tabel dokumen_mahasiswa
      try {
        const docRow = await db.query(
          'SELECT user_id FROM dokumen_mahasiswa WHERE file_path LIKE $1 LIMIT 1',
          [`%${filename}`]
        );
        if (docRow.rows.length > 0 && docRow.rows[0].user_id === user.id) {
          res.setHeader('Content-Type', 'application/pdf');
          return res.sendFile(filePath);
        }
      } catch (dbErr) {
        console.error('[serveAcademicDocument] Error checking document ownership in DB:', dbErr.message);
      }

      return res.status(403).json({ status: 'error', message: 'Bukan dokumen Anda' });
    }

    return res.status(403).json({ status: 'error', message: 'Akses ditolak' });
  } catch (err) {
    console.error('[serveAcademicDocument] Error:', err);
    return res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server' });
  }
}

module.exports = { serveAcademicDocument, extractNpm };
