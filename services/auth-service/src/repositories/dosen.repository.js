const db = require('../config/db');

const SEMESTER_RANGE_CTE = `
  WITH semester_range AS (
    SELECT
      CASE
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 1
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1, 8, 1)
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) BETWEEN 2 AND 7
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 2, 1)
        ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 8, 1)
      END AS start_date,
      CASE
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 1
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 2, 1)
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) BETWEEN 2 AND 7
          THEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 8, 1)
        ELSE MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, 2, 1)
      END AS end_date
  )
`;

// ================= GET DAFTAR MAHASISWA BIMBINGAN =================
exports.getMahasiswaBimbingan = async (dosenId) => {
  const result = await db.query(
    `SELECT u.id, u.name, u.npm_nip, u.profile_picture,
            m.angkatan, m.current_semester
     FROM mahasiswa m
     JOIN users u ON m.user_id = u.id
     WHERE m.dosen_pa_id = $1
       AND u.is_verified = true
     ORDER BY u.name ASC`,
    [dosenId]
  );
  return result.rows;
};

// ================= GET DETAIL MAHASISWA =================
exports.getMahasiswaDetail = async (mahasiswaId, dosenId) => {
  const result = await db.query(
    `SELECT u.id, u.name, u.npm_nip, u.email, u.profile_picture,
            m.angkatan, m.ipk, m.current_semester, m.dosen_pa_id,
            dp.kode_kelas
     FROM mahasiswa m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN dosen_pa dp ON dp.user_id = m.dosen_pa_id
     WHERE m.user_id = $1
       AND m.dosen_pa_id = $2`,
    [mahasiswaId, dosenId]
  );
  return result.rows[0];
};

// ================= GET RIWAYAT BIMBINGAN MAHASISWA =================
exports.getRiwayatBimbingan = async (mahasiswaId, dosenId) => {
  const result = await db.query(
    `SELECT b.id AS booking_id,
            j.tanggal, j.waktu_mulai, j.waktu_selesai,
            b.catatan AS agenda,
            b.status AS booking_status,
            j.keterangan
     FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     WHERE b.mahasiswa_id = $1
       AND j.dosen_id = $2
     ORDER BY j.tanggal DESC, j.waktu_mulai DESC`,
    [mahasiswaId, dosenId]
  );
  return result.rows;
};

// ================= UPDATE KETERANGAN DOSEN =================
exports.updateKeteranganDosen = async (bookingId, dosenId, keterangan) => {
  const result = await db.query(
    `UPDATE booking_bimbingan b
     SET keterangan = $1
     FROM jadwal_bimbingan j
     WHERE b.jadwal_id = j.id
       AND b.id = $2
       AND j.dosen_id = $3
     RETURNING b.*`,
    [keterangan, bookingId, dosenId]
  );
  return result.rows[0];
};

// ================= DASHBOARD DATA =================
exports.getDashboardProfile = async (dosenId) => {
  const result = await db.query(`
    SELECT
      u.name              AS nama_dosen,
      u.npm_nip           AS nip_dosen,
      u.profile_picture   AS foto_dosen,
      dp.kode_kelas
    FROM users u
    LEFT JOIN dosen_pa dp ON dp.user_id = u.id
    WHERE u.id = $1
  `, [dosenId]);
  return result.rows[0];
};

// ================= HITUNG MAHASISWA BIMBINGAN =================
exports.countMahasiswaBimbingan = async (dosenId) => {
  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM mahasiswa
    WHERE dosen_pa_id = $1
  `, [dosenId]);
  return parseInt(result.rows[0].total) || 0;
};

// ================= HITUNG BIMBINGAN HARI INI =================
exports.countBimbinganHariIni = async (dosenId) => {
  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM booking_bimbingan b
    JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
    WHERE j.dosen_id = $1
      AND j.tanggal = CURRENT_DATE
      AND b.status NOT IN ('dibatalkan')
  `, [dosenId]);
  return parseInt(result.rows[0].total) || 0;
};

// ================= HITUNG BIMBINGAN SEMESTER INI =================
exports.countBimbinganSemesterIni = async (dosenId) => {
  const result = await db.query(`
    SELECT COUNT(*) AS total
    FROM booking_bimbingan b
    JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
    WHERE j.dosen_id = $1
      AND b.status NOT IN ('dibatalkan')
      AND EXTRACT(YEAR  FROM j.tanggal) = EXTRACT(YEAR  FROM NOW())
      AND EXTRACT(MONTH FROM j.tanggal) BETWEEN
          CASE WHEN EXTRACT(MONTH FROM NOW()) >= 8 THEN 8 ELSE 2 END
          AND
          CASE WHEN EXTRACT(MONTH FROM NOW()) >= 8 THEN 12 ELSE 7 END
  `, [dosenId]);
  return parseInt(result.rows[0].total) || 0;
};

// ================= TOP MAHASISWA BIMBINGAN SEMESTER INI =================
exports.getTopMahasiswaBimbinganSemesterIni = async (dosenId) => {
  const result = await db.query(`
    ${SEMESTER_RANGE_CTE}
    SELECT
      u.name AS nama,
      u.npm_nip AS npm,
      COUNT(*) AS total
    FROM booking_bimbingan b
    JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
    JOIN users u ON u.id = b.mahasiswa_id
    JOIN mahasiswa m ON m.user_id = u.id
    CROSS JOIN semester_range sr
    WHERE j.dosen_id = $1
      AND m.dosen_pa_id = $1
      AND u.role = 'mahasiswa'
      AND u.is_verified = true
      AND b.status NOT IN ('dibatalkan')
      AND j.tanggal >= sr.start_date
      AND j.tanggal < sr.end_date
    GROUP BY u.id, u.name, u.npm_nip
    ORDER BY COUNT(*) DESC, u.name ASC
    LIMIT 5
  `, [dosenId]);
  return result.rows;
};

// ================= TOP MAHASISWA CHATBOT SEMESTER INI =================
exports.getTopMahasiswaChatbotSemesterIni = async (dosenId) => {
  const result = await db.query(`
    ${SEMESTER_RANGE_CTE}
    SELECT
      u.name AS nama,
      u.npm_nip AS npm,
      COUNT(*) AS total
    FROM chatbot_sessions cs
    JOIN users u ON u.id = cs.mahasiswa_id
    JOIN mahasiswa m ON m.user_id = u.id
    CROSS JOIN semester_range sr
    WHERE m.dosen_pa_id = $1
      AND u.role = 'mahasiswa'
      AND u.is_verified = true
      AND cs.created_at >= sr.start_date
      AND cs.created_at < sr.end_date
    GROUP BY u.id, u.name, u.npm_nip
    ORDER BY COUNT(*) DESC, u.name ASC
    LIMIT 5
  `, [dosenId]);
  return result.rows;
};

// ================= JADWAL MINGGU INI (+ booking mahasiswanya) =================
exports.getJadwalMingguIni = async (dosenId) => {
  // Ambil jadwal 7 hari ke depan dari hari ini
  const jadwalResult = await db.query(`
    SELECT
      j.id,
      j.tanggal         AS date,
      j.waktu_mulai     AS start_time,
      j.waktu_selesai   AS end_time,
      j.keterangan,
      j.kuota_tersisa
    FROM jadwal_bimbingan j
    WHERE j.dosen_id = $1
      AND j.tanggal >= CURRENT_DATE
      AND j.tanggal <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY j.tanggal ASC, j.waktu_mulai ASC
  `, [dosenId]);

  if (jadwalResult.rows.length === 0) return [];

  const jadwalIds = jadwalResult.rows.map(r => r.id);

  // Ambil semua booking untuk jadwal tersebut sekaligus
  const bookingResult = await db.query(`
    SELECT
      b.jadwal_id,
      u.name        AS nama,
      u.npm_nip     AS npm,
      b.catatan     AS agenda
    FROM booking_bimbingan b
    JOIN users u ON u.id = b.mahasiswa_id
    WHERE b.jadwal_id = ANY($1)
      AND b.status NOT IN ('dibatalkan')
    ORDER BY b.created_at ASC
  `, [jadwalIds]);

  // Kelompokkan booking by jadwal_id
  const bookingMap = {};
  for (const row of bookingResult.rows) {
    if (!bookingMap[row.jadwal_id]) bookingMap[row.jadwal_id] = [];
    bookingMap[row.jadwal_id].push({
      nama:   row.nama,
      npm:    row.npm,
      agenda: row.agenda || null,
    });
  }

  return jadwalResult.rows.map(j => ({
    ...j,
    mahasiswa: bookingMap[j.id] || [],
  }));
};

// ================= KALENDER BIMBINGAN DOSEN =================
exports.getKalenderBimbingan = async (dosenId) => {
  const result = await db.query(`
    SELECT DISTINCT
      j.tanggal     AS date,
      CASE
        WHEN j.kuota_tersisa = 0        THEN 'booked'
        WHEN j.kuota_tersisa > 0        THEN 'available'
        ELSE 'available'
      END           AS status
    FROM jadwal_bimbingan j
    WHERE j.dosen_id = $1
    ORDER BY j.tanggal ASC
  `, [dosenId]);
  return result.rows;
};
