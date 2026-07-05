const db = require('../config/db');

// ================= GET ALL JADWAL (by dosen_id, untuk kalender) =================
exports.getSchedulesByDosen = async (dosenId, filters = {}) => {
  const conditions = ['s.dosen_id = $1'];
  const values = [dosenId];
  let idx = 2;

  if (filters.month && filters.year) {
    conditions.push(`EXTRACT(MONTH FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.month));
    conditions.push(`EXTRACT(YEAR FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.year));
  }

  const result = await db.query(
    `SELECT s.id, s.dosen_id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status,
            s.created_at, s.updated_at
     FROM jadwal_bimbingan s
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.tanggal ASC, s.waktu_mulai ASC`,
    values
  );
  return result.rows;
};

// ================= GET JADWAL TERSEDIA (untuk mahasiswa booking) =================
exports.getAvailableSchedules = async (dosenId, filters = {}) => {
  const conditions = [
    's.dosen_id = $1',
    "s.status = 'tersedia'",
    's.kuota_tersisa > 0',
    's.tanggal >= CURRENT_DATE'
  ];
  const values = [dosenId];
  let idx = 2;

  if (filters.month && filters.year) {
    conditions.push(`EXTRACT(MONTH FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.month));
    conditions.push(`EXTRACT(YEAR FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.year));
  }

  const result = await db.query(
    `SELECT s.id, s.dosen_id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status,
            s.created_at, s.updated_at,
            u.name AS nama_dosen,
            u.npm_nip AS nip_dosen,
            u.profile_picture AS foto_dosen
     FROM jadwal_bimbingan s
     JOIN users u ON s.dosen_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.tanggal ASC, s.waktu_mulai ASC`,
    values
  );
  return result.rows;
};

// ================= GET DETAIL JADWAL =================
exports.findById = async (scheduleId) => {
  const result = await db.query(
    `SELECT s.id, s.dosen_id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status,
            s.created_at, s.updated_at,
            u.name AS nama_dosen,
            u.npm_nip AS nip_dosen,
            u.profile_picture AS foto_dosen
     FROM jadwal_bimbingan s
     JOIN users u ON s.dosen_id = u.id
     WHERE s.id = $1`,
    [scheduleId]
  );
  return result.rows[0];
};

// ================= ✅ HITUNG BOOKING AKTIF DARI DB (bukan dari selisih kolom) =================
// Sumber kebenaran tunggal — tidak bergantung pada kuota_tersisa yang bisa korup
exports.countActiveBookings = async (scheduleId) => {
  const result = await db.query(
    `SELECT COUNT(*) AS total
     FROM booking_bimbingan
     WHERE jadwal_id = $1 AND status = 'terkonfirmasi'`,
    [scheduleId]
  );
  return parseInt(result.rows[0].total);
};

// ================= CREATE JADWAL =================
exports.createSchedule = async (data) => {
  const result = await db.query(
    `INSERT INTO jadwal_bimbingan
      (dosen_id, tanggal, waktu_mulai, waktu_selesai, kuota, kuota_tersisa, keterangan, status)
     VALUES ($1, $2, $3, $4, $5, $5, $6, 'tersedia')
     RETURNING *`,
    [
      data.dosen_id,
      data.tanggal,
      data.waktu_mulai,
      data.waktu_selesai,
      data.kuota,
      data.keterangan || null
    ]
  );
  return result.rows[0];
};

// ================= ✅ UPDATE JADWAL (kuota_tersisa ikut dihitung ulang) =================
exports.updateSchedule = async (scheduleId, data) => {
  // kuota_tersisa = kuota_baru - booking_aktif (dihitung fresh dari DB)
  const result = await db.query(
    `UPDATE jadwal_bimbingan
     SET tanggal         = $1,
         waktu_mulai     = $2,
         waktu_selesai   = $3,
         kuota           = $4::integer,
         kuota_tersisa   = $4::integer - $5::integer,
         status          = CASE WHEN ($4::integer - $5::integer) <= 0 THEN 'penuh' ELSE 'tersedia' END,
         keterangan      = $6,
         updated_at      = NOW()
     WHERE id = $7
     RETURNING *`,
    [
      data.tanggal,
      data.waktu_mulai,
      data.waktu_selesai,
      data.kuota,
      data.bookingAktif,   // dihitung dari countActiveBookings di service
      data.keterangan || null,
      scheduleId
    ]
  );
  return result.rows[0];
};

// ================= ✅ DELETE JADWAL (hapus booking dulu, lalu jadwal) =================
exports.deleteScheduleWithBookings = async (scheduleId) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Hapus semua booking terkait terlebih dahulu
    await client.query(
      `DELETE FROM booking_bimbingan WHERE jadwal_id = $1`,
      [scheduleId]
    );
    const result = await client.query(
      `DELETE FROM jadwal_bimbingan WHERE id = $1 RETURNING *`,
      [scheduleId]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ================= CEK BOOKING DUPLIKAT (transactional) =================
exports.findBookingByUserAndScheduleTx = async (client, userId, scheduleId) => {
  const result = await client.query(
    `SELECT * FROM booking_bimbingan
     WHERE mahasiswa_id = $1 AND jadwal_id = $2 AND status = 'terkonfirmasi'`,
    [userId, scheduleId]
  );
  return result.rows[0];
};

// ================= CEK BOOKING PER HARI (transactional) =================
exports.findBookingByUserAndDateTx = async (client, userId, date) => {
  const result = await client.query(
    `SELECT b.id FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     WHERE b.mahasiswa_id = $1
       AND j.tanggal = $2
       AND b.status = 'terkonfirmasi'
     LIMIT 1`,
    [userId, date]
  );
  return result.rows[0];
};

// ================= LOCK JADWAL FOR UPDATE (mencegah race condition) =================
exports.findByIdForUpdate = async (client, scheduleId) => {
  const result = await client.query(
    `SELECT s.id, s.dosen_id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status,
            u.name AS nama_dosen
     FROM jadwal_bimbingan s
     JOIN users u ON s.dosen_id = u.id
     WHERE s.id = $1
     FOR UPDATE`,
    [scheduleId]
  );
  return result.rows[0];
};

// ================= BOOKING (transactional) =================
exports.createBookingTx = async (client, data) => {
  const result = await client.query(
    `INSERT INTO booking_bimbingan (mahasiswa_id, jadwal_id, catatan, status)
     VALUES ($1, $2, $3, 'terkonfirmasi')
     RETURNING *`,
    [data.mahasiswa_id, data.jadwal_id, data.catatan || null]
  );
  return result.rows[0];
};

// ================= KURANGI KUOTA (transactional) =================
exports.decrementKuotaTx = async (client, scheduleId) => {
  const result = await client.query(
    `UPDATE jadwal_bimbingan
     SET kuota_tersisa = kuota_tersisa - 1,
         status = CASE WHEN kuota_tersisa - 1 <= 0 THEN 'penuh' ELSE 'tersedia' END,
         updated_at = NOW()
     WHERE id = $1 AND kuota_tersisa > 0
     RETURNING *`,
    [scheduleId]
  );
  return result.rows[0];
};

// ================= LOCK BOOKING FOR UPDATE (mencegah race condition cancel) =================
exports.findBookingByIdForUpdate = async (client, bookingId) => {
  const result = await client.query(
    `SELECT b.*, j.dosen_id, j.kuota_tersisa
     FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     WHERE b.id = $1
     FOR UPDATE OF b`,
    [bookingId]
  );
  return result.rows[0];
};

// ================= UPDATE STATUS BOOKING (transactional) =================
exports.updateBookingStatusTx = async (client, bookingId, status) => {
  const result = await client.query(
    `UPDATE booking_bimbingan
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, bookingId]
  );
  return result.rows[0];
};

// ================= TAMBAH KUOTA KEMBALI (transactional, dengan guard overflow) =================
exports.incrementKuotaTx = async (client, scheduleId) => {
  const result = await client.query(
    `UPDATE jadwal_bimbingan
     SET kuota_tersisa = LEAST(kuota_tersisa + 1, kuota),
         status = 'tersedia',
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [scheduleId]
  );
  return result.rows[0];
};

// ================= GET BOOKING BY DOSEN =================
exports.getBookingsByDosen = async (dosenId, scheduleId = null) => {
  const conditions = ['j.dosen_id = $1'];
  const values = [dosenId];
  let idx = 2;

  if (scheduleId) {
    conditions.push(`b.jadwal_id = $${idx++}`);
    values.push(scheduleId);
  }

  const result = await db.query(
    `SELECT b.id AS booking_id, b.mahasiswa_id, b.status AS booking_status, b.catatan,
            b.created_at AS booked_at,
            u.name AS mahasiswa_name, u.npm_nip, u.profile_picture AS foto_mahasiswa,
            j.id AS jadwal_id, j.tanggal, j.waktu_mulai, j.waktu_selesai,
            j.kuota, j.kuota_tersisa, j.keterangan, j.status AS status_jadwal
     FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     JOIN users u ON b.mahasiswa_id = u.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY j.tanggal ASC, j.waktu_mulai ASC`,
    values
  );
  return result.rows;
};

// ================= GET BOOKING BY MAHASISWA =================
exports.getBookingsByMahasiswa = async (mahasiswaId) => {
  const result = await db.query(
    `SELECT b.id AS booking_id, b.status AS booking_status, b.catatan,
            b.created_at AS booked_at,
            j.id AS jadwal_id, j.tanggal, j.waktu_mulai, j.waktu_selesai,
            j.kuota, j.kuota_tersisa, j.keterangan, j.status AS status_jadwal,
            u.name AS nama_dosen, u.npm_nip AS nip_dosen, u.profile_picture AS foto_dosen
     FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     JOIN users u ON j.dosen_id = u.id
     WHERE b.mahasiswa_id = $1
     ORDER BY j.tanggal DESC`,
    [mahasiswaId]
  );
  return result.rows;
};

// ================= GET MONTHLY DATES (semua slot dalam sebulan, untuk kalender) =================
exports.getMonthlyDates = async (dosenId, year, month, onlyAvailable = false) => {
  const conditions = [
    's.dosen_id = $1',
    `EXTRACT(YEAR FROM s.tanggal) = $2`,
    `EXTRACT(MONTH FROM s.tanggal) = $3`
  ];
  const values = [dosenId, parseInt(year), parseInt(month)];

  if (onlyAvailable) {
    conditions.push("s.status = 'tersedia'");
    conditions.push('s.kuota_tersisa > 0');
    conditions.push('s.tanggal >= CURRENT_DATE');
  }

  // Return per-slot (bukan grouped) agar id tersedia untuk Android Retrofit
  const result = await db.query(
    `SELECT s.id, s.tanggal, s.kuota_tersisa
     FROM jadwal_bimbingan s
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.tanggal ASC, s.waktu_mulai ASC`,
    values
  );
  return result.rows;
};

// ================= GET DAILY SLOTS (semua slot + booking per tanggal) =================
exports.getDailySlots = async (dosenId, date, includeBookings = false) => {
  const result = await db.query(
    `SELECT s.id, s.dosen_id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status,
            s.created_at, s.updated_at,
            u.name AS nama_dosen,
            u.npm_nip AS nip_dosen,
            u.profile_picture AS foto_dosen
     FROM jadwal_bimbingan s
     JOIN users u ON s.dosen_id = u.id
     WHERE s.dosen_id = $1 AND s.tanggal = $2
     ORDER BY s.waktu_mulai ASC`,
    [dosenId, date]
  );

  if (!includeBookings || result.rows.length === 0) {
    return result.rows;
  }

  // Ambil semua booking untuk jadwal-jadwal di tanggal ini sekaligus
  const scheduleIds = result.rows.map(r => r.id);
  const bookings = await db.query(
    `SELECT b.id AS booking_id, b.jadwal_id, b.mahasiswa_id,
            b.status AS booking_status, b.catatan, b.created_at AS booked_at,
            u.name AS mahasiswa_name, u.npm_nip, u.profile_picture AS foto_mahasiswa
     FROM booking_bimbingan b
     JOIN users u ON b.mahasiswa_id = u.id
     WHERE b.jadwal_id = ANY($1) AND b.status = 'terkonfirmasi'
     ORDER BY b.created_at ASC`,
    [scheduleIds]
  );

  // Gabungkan booking ke masing-masing slot
  const bookingMap = {};
  for (const booking of bookings.rows) {
    if (!bookingMap[booking.jadwal_id]) bookingMap[booking.jadwal_id] = [];
    bookingMap[booking.jadwal_id].push(booking);
  }

  return result.rows.map(slot => ({
    ...slot,
    bookings: bookingMap[slot.id] || []
  }));
};

// ================= GET DAILY SLOTS MAHASISWA (dengan status booking milik mahasiswa tsb) =================
exports.getDailySlotsForMahasiswa = async (dosenId, date, mahasiswaId) => {
  const result = await db.query(
    `SELECT s.id, s.dosen_id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status,
            u.name AS nama_dosen,
            u.npm_nip AS nip_dosen,
            u.profile_picture AS foto_dosen,
            b.id AS booking_id,
            b.catatan AS mahasiswa_agenda
     FROM jadwal_bimbingan s
     JOIN users u ON s.dosen_id = u.id
     LEFT JOIN booking_bimbingan b
       ON b.jadwal_id = s.id
      AND b.mahasiswa_id = $3
      AND b.status = 'terkonfirmasi'
     WHERE s.dosen_id = $1 AND s.tanggal = $2
     ORDER BY s.waktu_mulai ASC`,
    [dosenId, date, mahasiswaId]
  );
  return result.rows;
};

// ================= GET MONTHLY MAHASISWA (slot + status booking milik mahasiswa tsb) =================
exports.getMonthlyForMahasiswa = async (dosenId, year, month, mahasiswaId) => {
  const result = await db.query(
    `SELECT s.id, s.tanggal, s.kuota_tersisa, s.status,
            b.id AS booking_id
     FROM jadwal_bimbingan s
     LEFT JOIN booking_bimbingan b
       ON b.jadwal_id = s.id
      AND b.mahasiswa_id = $4
      AND b.status = 'terkonfirmasi'
     WHERE s.dosen_id = $1
       AND EXTRACT(YEAR FROM s.tanggal) = $2
       AND EXTRACT(MONTH FROM s.tanggal) = $3
     ORDER BY s.tanggal ASC, s.waktu_mulai ASC`,
    [dosenId, parseInt(year), parseInt(month), mahasiswaId]
  );
  return result.rows;
};

// ================= GET HISTORY BOOKING MAHASISWA (jadwal yang sudah lewat) =================
exports.getBookingHistoryMahasiswa = async (mahasiswaId) => {
  const result = await db.query(
    `SELECT b.id AS booking_id, b.status AS booking_status, b.catatan AS mahasiswa_agenda,
            b.created_at AS booked_at,
            j.id AS jadwal_id, j.tanggal, j.waktu_mulai, j.waktu_selesai,
            j.kuota, j.kuota_tersisa, j.keterangan, j.status AS status_jadwal,
            u.name AS nama_dosen, u.npm_nip AS nip_dosen, u.profile_picture AS foto_dosen
     FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     JOIN users u ON j.dosen_id = u.id
     WHERE b.mahasiswa_id = $1
     ORDER BY j.tanggal DESC, j.waktu_mulai DESC`,
    [mahasiswaId]
  );
  return result.rows;
};
