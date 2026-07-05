const db = require('../config/db');

// ================= DASHBOARD DATA =================
exports.getDashboardData = async (userId) => {
  const result = await db.query(`
    SELECT
      u.name                AS nama_mahasiswa,
      u.npm_nip             AS npm_mahasiswa,
      u.profile_picture     AS foto_mahasiswa,
      m.ipk,
      m.current_semester,
      pa.name               AS dosen_pa,
      pa.npm_nip            AS nip_dosen,
      pa.profile_picture    AS foto_dosen
    FROM users u
    JOIN mahasiswa m        ON m.user_id = u.id
    LEFT JOIN users pa      ON pa.id = m.dosen_pa_id
    WHERE u.id = $1
  `, [userId]);
  return result.rows[0];
};

// ================= HITUNG BIMBINGAN SEMESTER INI =================
exports.countBimbinganSemesterIni = async (userId) => {
  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM booking_bimbingan b
    JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
    WHERE b.mahasiswa_id = $1
      AND b.status NOT IN ('dibatalkan')
      AND j.tanggal BETWEEN
          CASE
            WHEN EXTRACT(MONTH FROM NOW()) >= 8
              THEN DATE_TRUNC('month', DATE_TRUNC('year', NOW()) + INTERVAL '7 months')
            WHEN EXTRACT(MONTH FROM NOW()) <= 1
              THEN DATE_TRUNC('month', DATE_TRUNC('year', NOW()) - INTERVAL '5 months')
            ELSE DATE_TRUNC('month', DATE_TRUNC('year', NOW()) + INTERVAL '1 month')
          END
          AND
          CASE
            WHEN EXTRACT(MONTH FROM NOW()) >= 8
              THEN DATE_TRUNC('month', DATE_TRUNC('year', NOW()) + INTERVAL '13 months') - INTERVAL '1 day'
            WHEN EXTRACT(MONTH FROM NOW()) <= 1
              THEN DATE_TRUNC('month', DATE_TRUNC('year', NOW()) + INTERVAL '1 month') - INTERVAL '1 day'
            ELSE DATE_TRUNC('month', DATE_TRUNC('year', NOW()) + INTERVAL '7 months') - INTERVAL '1 day'
          END
  `, [userId]);
  return parseInt(result.rows[0].total) || 0;
};

// ================= HITUNG BIMBINGAN KESELURUHAN =================
exports.countBimbinganKeseluruhan = async (userId) => {
  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM booking_bimbingan b
    WHERE b.mahasiswa_id = $1
      AND b.status NOT IN ('dibatalkan')
  `, [userId]);
  return parseInt(result.rows[0].total) || 0;
};

// ================= HITUNG CHATBOT BULAN INI =================
exports.countChatbotBulanIni = async (userId) => {
  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM chatbot_sessions cs
    WHERE cs.mahasiswa_id = $1
      AND cs.created_at >= date_trunc('month', NOW())
      AND cs.created_at < date_trunc('month', NOW()) + INTERVAL '1 month'
  `, [userId]);

  return parseInt(result.rows[0].total) || 0;
};

// ================= JADWAL BIMBINGAN AKTIF =================
exports.getJadwalTerdekat = async (userId) => {
  const result = await db.query(`
    SELECT
      j.id,
      j.tanggal           AS date,
      j.waktu_mulai       AS start_time,
      j.waktu_selesai     AS end_time,
      j.keterangan,
      b.catatan           AS mahasiswa_agenda,
      b.status
    FROM booking_bimbingan b
    JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
    WHERE b.mahasiswa_id = $1
      AND b.status NOT IN ('dibatalkan', 'selesai')
      AND j.tanggal >= CURRENT_DATE
    ORDER BY j.tanggal ASC, j.waktu_mulai ASC
  `, [userId]);
  return result.rows;
};

// ================= KALENDER BIMBINGAN =================
exports.getKalenderBimbingan = async (userId) => {
  const result = await db.query(`
    SELECT
      j.tanggal   AS date,
      b.status
    FROM booking_bimbingan b
    JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
    WHERE b.mahasiswa_id = $1
      AND b.status NOT IN ('dibatalkan')
    ORDER BY j.tanggal ASC
  `, [userId]);
  return result.rows;
};
