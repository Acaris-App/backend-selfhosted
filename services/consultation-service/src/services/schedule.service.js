const db = require('../config/db');
const scheduleRepository = require('../repositories/schedule.repository');
const profileRepository = require('../repositories/profile.repository');

// ================= HELPER: FORMAT SLOT KE API CONTRACT =================
// Memetakan field DB ke field yang diexpect Android (Retrofit data class)
const formatSlot = (row, dosenName = null) => ({
  id:              row.id,
  dosen_id:        row.dosen_id,
  dosen_name:      dosenName || row.nama_dosen || null,
  date:            row.tanggal,
  start_time:      row.waktu_mulai,
  end_time:        row.waktu_selesai,
  quota:           row.kuota,
  remaining_quota: row.kuota_tersisa,
  status:          row.status === 'tersedia' ? 'Tersedia' : 'Penuh',
  keterangan:      row.keterangan || null
});

const formatStudent = (b) => ({
  id:          b.mahasiswa_id,
  nama:        b.mahasiswa_name,
  npm:         b.npm_nip,
  keterangan:  b.catatan || null
});

// ================= GET JADWAL (Dosen) =================
exports.getMySchedules = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses jadwal ini" };
  }

  const schedules = await scheduleRepository.getSchedulesByDosen(user.id, {
    month: query.month,
    year: query.year
  });

  return { total: schedules.length, schedules: schedules.map(s => formatSlot(s)) };
};

// ================= GET JADWAL TERSEDIA (Mahasiswa) =================
exports.getAvailableSchedules = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  const schedules = await scheduleRepository.getAvailableSchedules(profile.dosen_pa_id, {
    month: query.month,
    year: query.year
  });

  return { total: schedules.length, schedules: schedules.map(s => formatSlot(s)) };
};

// ================= GET DETAIL JADWAL =================
exports.getScheduleDetail = async ({ user, scheduleId }) => {
  const schedule = await scheduleRepository.findById(scheduleId);
  if (!schedule) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (user.role === 'dosen' && schedule.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak" };
  }

  if (user.role === 'mahasiswa') {
    const profile = await profileRepository.getMahasiswaProfile(user.id);
    if (!profile || profile.dosen_pa_id !== schedule.dosen_id) {
      throw { status: 403, message: "Akses ditolak" };
    }
  }

  return formatSlot(schedule);
};

// ================= TAMBAH JADWAL =================
// Body: { date, start_time, end_time, quota, keterangan }
exports.createSchedule = async ({ user, body }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat membuat jadwal" };
  }

  const { date, start_time, end_time, quota, keterangan } = body;

  if (!date || !start_time || !end_time || !quota) {
    throw { status: 400, message: "date, start_time, end_time, dan quota wajib diisi" };
  }

  if (isNaN(Date.parse(date))) {
    throw { status: 400, message: "Format date tidak valid (gunakan YYYY-MM-DD)" };
  }

  if (new Date(date) < new Date().setHours(0, 0, 0, 0)) {
    throw { status: 400, message: "Tanggal jadwal tidak boleh di masa lalu" };
  }

  if (start_time >= end_time) {
    throw { status: 400, message: "Waktu mulai harus sebelum waktu selesai" };
  }

  const quotaInt = parseInt(quota);
  if (isNaN(quotaInt) || quotaInt < 1) {
    throw { status: 400, message: "Quota minimal 1" };
  }

  const row = await scheduleRepository.createSchedule({
    dosen_id:     user.id,
    tanggal:      date,
    waktu_mulai:  start_time,
    waktu_selesai: end_time,
    kuota:        quotaInt,
    keterangan
  });

  // Ambil ulang dengan JOIN supaya nama dosen tersedia
  const full = await scheduleRepository.findById(row.id);
  return formatSlot(full);
};

// ================= EDIT JADWAL =================
// Body: { date, start_time, end_time, quota, keterangan }
exports.updateSchedule = async ({ user, scheduleId, body }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengubah jadwal" };
  }

  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (existing.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak — bukan jadwal Anda" };
  }

  const { date, start_time, end_time, quota, keterangan } = body;

  if (!date || !start_time || !end_time || !quota) {
    throw { status: 400, message: "date, start_time, end_time, dan quota wajib diisi" };
  }

  if (isNaN(Date.parse(date))) {
    throw { status: 400, message: "Format date tidak valid (gunakan YYYY-MM-DD)" };
  }

  if (start_time >= end_time) {
    throw { status: 400, message: "Waktu mulai harus sebelum waktu selesai" };
  }

  const quotaInt = parseInt(quota);
  if (isNaN(quotaInt) || quotaInt < 1) {
    throw { status: 400, message: "Quota minimal 1" };
  }

  const bookingAktif = await scheduleRepository.countActiveBookings(scheduleId);

  if (quotaInt < bookingAktif) {
    throw {
      status: 400,
      message: `Quota tidak boleh kurang dari jumlah mahasiswa yang sudah booking (${bookingAktif})`
    };
  }

  const row = await scheduleRepository.updateSchedule(scheduleId, {
    tanggal:      date,
    waktu_mulai:  start_time,
    waktu_selesai: end_time,
    kuota:        quotaInt,
    bookingAktif,
    keterangan
  });

  const full = await scheduleRepository.findById(row.id);
  return formatSlot(full);
};

// ================= HAPUS JADWAL =================
exports.deleteSchedule = async ({ user, scheduleId }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat menghapus jadwal" };
  }

  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (existing.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak — bukan jadwal Anda" };
  }

  const bookingAktif = await scheduleRepository.countActiveBookings(scheduleId);

  if (bookingAktif > 0) {
    throw {
      status: 400,
      message: `Jadwal tidak dapat dihapus karena sudah ada ${bookingAktif} mahasiswa yang booking`
    };
  }

  await scheduleRepository.deleteScheduleWithBookings(scheduleId);

  return { message: "Jadwal berhasil dihapus" };
};

// ================= BOOKING JADWAL (Mahasiswa) =================
exports.bookSchedule = async ({ user, body }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat booking jadwal" };
  }

  const { jadwal_id, catatan } = body;

  if (!jadwal_id) {
    throw { status: 400, message: "jadwal_id wajib diisi" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const schedule = await scheduleRepository.findByIdForUpdate(client, jadwal_id);
    if (!schedule) throw { status: 404, message: "Jadwal tidak ditemukan" };

    if (!profile || profile.dosen_pa_id !== schedule.dosen_id) {
      throw { status: 403, message: "Anda hanya dapat booking jadwal dosen PA Anda" };
    }

    if (schedule.status !== 'tersedia') {
      throw { status: 400, message: "Jadwal sudah penuh atau tidak tersedia" };
    }

    if (schedule.kuota_tersisa <= 0) {
      throw { status: 400, message: "Kuota jadwal sudah penuh" };
    }

    const duplikat = await scheduleRepository.findBookingByUserAndScheduleTx(client, user.id, jadwal_id);
    if (duplikat) {
      throw { status: 400, message: "Anda sudah melakukan booking untuk jadwal ini" };
    }

    const booking = await scheduleRepository.createBookingTx(client, {
      mahasiswa_id: user.id,
      jadwal_id,
      catatan
    });

    const updatedSchedule = await scheduleRepository.decrementKuotaTx(client, jadwal_id);
    if (!updatedSchedule) {
      throw { status: 400, message: "Kuota jadwal sudah penuh" };
    }

    await client.query('COMMIT');

    return {
      booking_id:      booking.id,
      jadwal_id:       schedule.id,
      date:            schedule.tanggal,
      start_time:      schedule.waktu_mulai,
      end_time:        schedule.waktu_selesai,
      status:          booking.status,
      remaining_quota: updatedSchedule.kuota_tersisa
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ================= BATALKAN BOOKING =================
exports.cancelBooking = async ({ user, bookingId }) => {

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Lock baris booking untuk mencegah race condition
    const booking = await scheduleRepository.findBookingByIdForUpdate(client, bookingId);
    if (!booking) throw { status: 404, message: "Booking tidak ditemukan" };

    if (user.role === 'mahasiswa' && booking.mahasiswa_id !== user.id) {
      throw { status: 403, message: "Akses ditolak" };
    }

    if (user.role === 'dosen' && booking.dosen_id !== user.id) {
      throw { status: 403, message: "Akses ditolak" };
    }

    if (booking.status === 'dibatalkan') {
      throw { status: 400, message: "Booking sudah dibatalkan sebelumnya" };
    }

    await scheduleRepository.updateBookingStatusTx(client, bookingId, 'dibatalkan');

    // Kembalikan kuota + set status jadwal kembali 'tersedia'
    await scheduleRepository.incrementKuotaTx(client, booking.jadwal_id);

    await client.query('COMMIT');

    return { message: "Booking berhasil dibatalkan, kuota jadwal telah dikembalikan" };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ================= GET DAFTAR BOOKING (Dosen) =================
exports.getBookings = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat melihat daftar booking" };
  }

  const bookings = await scheduleRepository.getBookingsByDosen(
    user.id,
    query.jadwal_id || null
  );

  return { total: bookings.length, bookings };
};

// ================= GET BOOKING MILIK MAHASISWA =================
exports.getMyBookings = async ({ user }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses ini" };
  }

  const bookings = await scheduleRepository.getBookingsByMahasiswa(user.id);

  return { total: bookings.length, bookings };
};

// ================= GET MONTHLY — data langsung array untuk Retrofit =================
exports.getMonthlySchedulesDosen = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  const { year, month } = query;
  if (!year || !month) throw { status: 400, message: "year dan month wajib diisi" };

  const rows = await scheduleRepository.getMonthlyDates(user.id, year, month, false);

  return rows.map(r => ({
    id:              r.id,
    date:            r.tanggal,
    remaining_quota: parseInt(r.kuota_tersisa) || 0
  }));
};

exports.getMonthlySchedulesMahasiswa = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const { year, month } = query;
  if (!year || !month) throw { status: 400, message: "year dan month wajib diisi" };

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  const rows = await scheduleRepository.getMonthlyDates(profile.dosen_pa_id, year, month, true);

  return rows.map(r => ({
    id:              r.id,
    date:            r.tanggal,
    remaining_quota: parseInt(r.kuota_tersisa) || 0
  }));
};

// ================= GET DAILY — data langsung array untuk Retrofit =================
exports.getDailySchedulesDosen = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  const { date } = query;
  if (!date) throw { status: 400, message: "date wajib diisi (format: YYYY-MM-DD)" };
  if (isNaN(Date.parse(date))) throw { status: 400, message: "Format date tidak valid (gunakan YYYY-MM-DD)" };

  // Dosen: include daftar mahasiswa yang booking per slot
  const slots = await scheduleRepository.getDailySlots(user.id, date, true);

  return slots.map(slot => ({
    ...formatSlot(slot),
    booked_students: (slot.bookings || []).map(formatStudent)
  }));
};

exports.getDailySchedulesMahasiswa = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const { date } = query;
  if (!date) throw { status: 400, message: "date wajib diisi (format: YYYY-MM-DD)" };
  if (isNaN(Date.parse(date))) throw { status: 400, message: "Format date tidak valid (gunakan YYYY-MM-DD)" };

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  // Mahasiswa: tidak tampilkan booking orang lain
  const slots = await scheduleRepository.getDailySlots(profile.dosen_pa_id, date, false);

  return slots.map(slot => formatSlot(slot));
};

// ================= MAHASISWA: GET MONTHLY =================
// Status per slot: "Tersedia", "Penuh", atau "Di-booking" (kalau mahasiswa ini sudah booking)
exports.getMahasiswaMonthly = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const { year, month } = query;
  if (!year || !month) throw { status: 400, message: "year dan month wajib diisi" };

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  const rows = await scheduleRepository.getMonthlyForMahasiswa(
    profile.dosen_pa_id, year, month, user.id
  );

  return rows.map(r => ({
    id:              r.id,
    date:            r.tanggal,
    remaining_quota: r.kuota_tersisa,
    booking_id:      r.booking_id || null
  }));
};

// ================= MAHASISWA: GET DAILY =================
// Tiap slot ada booking_id dan mahasiswa_agenda jika mahasiswa ini sudah booking slot tsb
exports.getMahasiswaDaily = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const { date } = query;
  if (!date) throw { status: 400, message: "date wajib diisi (format: YYYY-MM-DD)" };
  if (isNaN(Date.parse(date))) throw { status: 400, message: "Format date tidak valid (gunakan YYYY-MM-DD)" };

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  const slots = await scheduleRepository.getDailySlotsForMahasiswa(
    profile.dosen_pa_id, date, user.id
  );

  return slots.map(slot => ({
    id:              slot.id,
    dosen_id:        slot.dosen_id,
    dosen_name:      slot.nama_dosen || null,
    date:            slot.tanggal,
    start_time:      slot.waktu_mulai,
    end_time:        slot.waktu_selesai,
    quota:           slot.kuota,
    remaining_quota: slot.kuota_tersisa,
    status:          slot.status === 'tersedia' ? 'Tersedia' : 'Penuh',
    keterangan:      slot.keterangan || null,
    booking_id:      slot.booking_id || null,
    mahasiswa_agenda: slot.mahasiswa_agenda || null
  }));
};

// ================= MAHASISWA: BOOK JADWAL =================
// Field baru: schedule_id (bukan jadwal_id), agenda (bukan catatan)
// Validasi: hanya 1 booking per hari
exports.mahasiswaBookSchedule = async ({ user, body }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat booking jadwal" };
  }

  const { schedule_id, agenda, jadwal_id, catatan } = body;
  const final_schedule_id = schedule_id || jadwal_id;
  const final_agenda = agenda || catatan;

  if (!final_schedule_id) {
    throw { status: 400, message: "schedule_id atau jadwal_id wajib diisi" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const schedule = await scheduleRepository.findByIdForUpdate(client, final_schedule_id);
    if (!schedule) throw { status: 404, message: "Jadwal tidak ditemukan" };

    if (!profile || profile.dosen_pa_id !== schedule.dosen_id) {
      throw { status: 403, message: "Anda hanya dapat booking jadwal dosen PA Anda" };
    }

    if (schedule.status !== 'tersedia') {
      throw { status: 400, message: "Jadwal sudah penuh atau tidak tersedia" };
    }

    if (schedule.kuota_tersisa <= 0) {
      throw { status: 400, message: "Kuota jadwal sudah penuh" };
    }

    const existingToday = await scheduleRepository.findBookingByUserAndDateTx(
      client, user.id, schedule.tanggal
    );
    if (existingToday) {
      throw { status: 400, message: "Anda sudah memiliki booking di tanggal ini, hanya 1 slot per hari yang diizinkan" };
    }

    const duplikat = await scheduleRepository.findBookingByUserAndScheduleTx(client, user.id, final_schedule_id);
    if (duplikat) {
      throw { status: 400, message: "Anda sudah melakukan booking untuk jadwal ini" };
    }

    const booking = await scheduleRepository.createBookingTx(client, {
      mahasiswa_id: user.id,
      jadwal_id: final_schedule_id,
      catatan: final_agenda || null
    });

    const updatedSchedule = await scheduleRepository.decrementKuotaTx(client, final_schedule_id);
    if (!updatedSchedule) {
      throw { status: 400, message: "Kuota jadwal sudah penuh" };
    }

    await client.query('COMMIT');

    return {
      booking_id:      booking.id,
      schedule_id:     schedule.id,
      date:            schedule.tanggal,
      start_time:      schedule.waktu_mulai,
      end_time:        schedule.waktu_selesai,
      status:          'booked',
      mahasiswa_agenda: final_agenda || null,
      remaining_quota: updatedSchedule.kuota_tersisa
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ================= MAHASISWA: HISTORY BOOKING =================
// Hanya jadwal yang sudah lewat atau dibatalkan
exports.getMahasiswaBookingHistory = async ({ user }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses ini" };
  }

  const rows = await scheduleRepository.getBookingHistoryMahasiswa(user.id);

  return rows.map(row => ({
    id:               row.booking_id,
    jadwal_id:        row.jadwal_id,
    dosen_name:       row.nama_dosen || null,
    date:             row.tanggal,
    start_time:       row.waktu_mulai,
    end_time:         row.waktu_selesai,
    status:           row.booking_status === 'dibatalkan'
      ? 'dibatalkan'
      : new Date(row.tanggal) < new Date().setHours(0, 0, 0, 0)
        ? 'selesai'
        : 'dijadwalkan',
    keterangan:       row.keterangan || null,
    agenda:           row.mahasiswa_agenda || null
  }));
};
