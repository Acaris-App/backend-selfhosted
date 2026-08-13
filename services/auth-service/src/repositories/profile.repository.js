const db = require('../config/db');

// ================= GET MAHASISWA PROFILE =================
exports.getMahasiswaProfile = async (userId) => {
  const result = await db.query(`
    SELECT m.angkatan, m.ipk, m.current_semester, m.konsentrasi, m.dosen_pa_id,
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
    (user_id, angkatan, ipk, current_semester, konsentrasi, dosen_pa_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.user_id,
      data.angkatan,
      data.ipk,
      data.current_semester,
      data.konsentrasi || null,
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
  if (data.konsentrasi !== undefined) {
    fields.push(`konsentrasi = $${idx++}`);
    values.push(data.konsentrasi);
  }

  if (fields.length === 0) return;

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  await db.query(
    `UPDATE mahasiswa SET ${fields.join(', ')} WHERE user_id = $${idx}`,
    values
  );
};

exports.findActiveCurriculumByYearTx = async (client, year) => {
  const result = await client.query(
    `SELECT id FROM kurikulum WHERE status = 'aktif' AND tahun_mulai = $1 LIMIT 1`,
    [year]
  );
  return result.rows[0];
};

exports.hasConcentrationForCurriculumTx = async (client, curriculumId, name) => {
  const result = await client.query(
    `SELECT 1 FROM konsentrasi WHERE kurikulum_id = $1 AND nama = $2 AND status = 'aktif' LIMIT 1`,
    [curriculumId, name]
  );
  return Boolean(result.rows[0]);
};

exports.hasConcentrationForStudent = async (userId, name) => {
  const result = await db.query(
    `SELECT 1
     FROM mahasiswa m
     JOIN users u ON u.id = m.user_id
     JOIN kurikulum k ON k.status = 'aktif' AND k.tahun_mulai = CASE
       WHEN COALESCE(m.angkatan, 2000 + NULLIF(SUBSTRING(u.npm_nip FROM '^([0-9]{2})'), '')::INTEGER) >= 2025
         THEN 2025
       ELSE 2020
     END
     JOIN konsentrasi c ON c.kurikulum_id = k.id AND c.status = 'aktif'
     WHERE m.user_id = $1 AND c.nama = $2
     LIMIT 1`,
    [userId, name]
  );
  return Boolean(result.rows[0]);
};

exports.assignMahasiswaKurikulumTx = async (client, userId, curriculumId) => {
  await client.query(
    `INSERT INTO mahasiswa_kurikulum (mahasiswa_user_id, kurikulum_id, assignment_source)
     VALUES ($1, $2, 'registration')
     ON CONFLICT (mahasiswa_user_id) DO UPDATE SET kurikulum_id = EXCLUDED.kurikulum_id,
       assignment_source = EXCLUDED.assignment_source, assigned_at = NOW()`,
    [userId, curriculumId]
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
