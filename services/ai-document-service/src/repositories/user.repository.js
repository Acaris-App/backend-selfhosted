const db = require('../config/db');

// ================= FIND BY EMAIL =================
exports.findByEmail = async (email) => {
  const result = await db.query(`
    SELECT id, name, email, password, role, npm_nip, profile_picture, is_verified
    FROM users
    WHERE email = $1
    LIMIT 1
  `, [email]);

  return result.rows[0];
};

// ================= FIND BY ID =================
exports.findById = async (id) => {
  const result = await db.query(`
    SELECT id, name, email, password, role, npm_nip, profile_picture, is_verified
    FROM users
    WHERE id = $1
    LIMIT 1
  `, [id]);

  return result.rows[0];
};

// ================= FIND BY NPM/NIP =================
exports.findByNpm = async (npm_nip) => {
  const result = await db.query(
    'SELECT * FROM users WHERE npm_nip = $1',
    [npm_nip]
  );

  return result.rows[0];
};

// ================= CREATE USER (dalam transaksi) =================
exports.createUserTx = async (client, data) => {
  const result = await client.query(
    `INSERT INTO users (name, email, password, role, npm_nip, profile_picture)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.name, data.email, data.password, data.role, data.npm_nip, data.profile_picture || null]
  );

  return result.rows[0];
};

// ================= DELETE UNVERIFIED USER =================
// Dipanggil saat user mencoba register ulang sebelum OTP diverifikasi
exports.deleteUnverifiedUser = async (userId) => {
  await db.query('DELETE FROM users WHERE id = $1 AND is_verified = FALSE', [userId]);
};

// ================= VERIFY USER =================
exports.verifyUser = async (userId) => {
  await db.query(
    'UPDATE users SET is_verified = TRUE WHERE id = $1',
    [userId]
  );
};

// ================= UPDATE PASSWORD =================
exports.updatePassword = async (userId, hashedPassword) => {
  await db.query(
    'UPDATE users SET password = $1 WHERE id = $2',
    [hashedPassword, userId]
  );
};

// ================= UPDATE PROFILE TEXT =================
exports.updateProfileText = async (userId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }

  if (data.npm_nip !== undefined) {
    fields.push(`npm_nip = $${idx++}`);
    values.push(data.npm_nip);
  }

  if (fields.length === 0) return null;

  values.push(userId);

  const result = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, npm_nip, profile_picture, role`,
    values
  );

  return result.rows[0];
};

// ================= UPDATE PROFILE PHOTO =================
exports.updateProfilePhoto = async (userId, profilePictureUrl) => {
  const result = await db.query(
    `UPDATE users
     SET profile_picture = $1
     WHERE id = $2
     RETURNING id, name, email, npm_nip, profile_picture, role`,
    [profilePictureUrl, userId]
  );

  return result.rows[0];
};

// ================= UPDATE PROFILE (name + photo) =================
exports.updateProfile = async (userId, data) => {
  const result = await db.query(
    `UPDATE users
     SET name = $1, profile_picture = $2
     WHERE id = $3
     RETURNING id, name, email, npm_nip, profile_picture, role`,
    [data.name, data.profile_picture, userId]
  );

  return result.rows[0];
};
