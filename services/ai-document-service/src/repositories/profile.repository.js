const db = require('../config/db');

// ================= GET MAHASISWA PROFILE =================
exports.getMahasiswaProfile = async (userId) => {
  const result = await db.query(`
    SELECT m.angkatan, m.ipk, m.current_semester, m.dosen_pa_id,
           u.name AS nama_dosen_pa,
           u.npm_nip AS nip_dosen_pa,
           u.profile_picture AS foto_dosen_pa
    FROM mahasiswa m
    LEFT JOIN dosen_pa dp ON m.dosen_pa_id = dp.user_id
    LEFT JOIN users u ON dp.user_id = u.id
    WHERE m.user_id = $1
  `, [userId]);

  return result.rows[0];
};

// ================= GET DOSEN PROFILE =================
exports.getDosenProfile = async (userId) => {
  const result = await db.query(`
    SELECT kode_kelas
    FROM dosen_pa
    WHERE user_id = $1
  `, [userId]);

  return result.rows[0];
};

// ================= FIND DOSEN BY KODE KELAS =================
exports.findDosenByKode = async (kode_kelas) => {
  const result = await db.query(
    `SELECT * FROM dosen_pa WHERE kode_kelas = $1`,
    [kode_kelas]
  );

  return result.rows[0];
};

// ================= CREATE MAHASISWA (dalam transaksi) =================
exports.createMahasiswaTx = async (client, data) => {
  await client.query(
    `INSERT INTO mahasiswa 
    (user_id, angkatan, ipk, current_semester, dosen_pa_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      data.user_id,
      data.angkatan,
      data.ipk,
      data.current_semester,
      data.dosen_pa_id
    ]
  );
};

// ================= CREATE DOSEN (dalam transaksi) =================
exports.createDosenTx = async (client, data) => {
  await client.query(
    `INSERT INTO dosen_pa (user_id, kode_kelas)
     VALUES ($1, $2)`,
    [data.user_id, data.kode_kelas]
  );
};

// ================= UPDATE KODE KELAS DOSEN =================
exports.updateDosenKodeKelas = async (userId, kodeKelas) => {
  await db.query(
    `UPDATE dosen_pa SET kode_kelas = $1 WHERE user_id = $2`,
    [kodeKelas, userId]
  );
};

// ================= UPDATE MAHASISWA PROFILE =================
exports.updateMahasiswaProfile = async (userId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.angkatan !== undefined) {
    fields.push(`angkatan = $${idx++}`);
    values.push(data.angkatan);
  }
  if (data.ipk !== undefined) {
    fields.push(`ipk = $${idx++}`);
    values.push(data.ipk);
  }
  if (data.current_semester !== undefined) {
    fields.push(`current_semester = $${idx++}`);
    values.push(data.current_semester);
  }

  if (fields.length === 0) return;

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  await db.query(
    `UPDATE mahasiswa SET ${fields.join(', ')} WHERE user_id = $${idx}`,
    values
  );
};

// ================= UPDATE SEMESTER =================
exports.updateSemester = async (userId, semester) => {
  await db.query(
    `UPDATE mahasiswa 
     SET current_semester = $1, updated_at = NOW()
     WHERE user_id = $2`,
    [semester, userId]
  );
};
