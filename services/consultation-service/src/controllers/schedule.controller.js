const scheduleService = require('../services/schedule.service');

// ================= GET JADWAL DOSEN (kalender kelola) =================
exports.getMySchedules = async (req, res, next) => {
  try {
    const result = await scheduleService.getMySchedules({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data jadwal berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= GET JADWAL TERSEDIA (kalender booking mahasiswa) =================
exports.getAvailableSchedules = async (req, res, next) => {
  try {
    const result = await scheduleService.getAvailableSchedules({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data jadwal tersedia berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= GET DETAIL JADWAL =================
exports.getScheduleDetail = async (req, res, next) => {
  try {
    const result = await scheduleService.getScheduleDetail({ user: req.user, scheduleId: req.params.schedule_id });
    res.json({ status: "success", message: "Detail jadwal berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= TAMBAH JADWAL =================
exports.createSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.createSchedule({ user: req.user, body: req.body });
    res.status(201).json({ status: "success", message: "Jadwal berhasil dibuat", data: result });
  } catch (err) { next(err); }
};

// ================= EDIT JADWAL =================
exports.updateSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.updateSchedule({ user: req.user, scheduleId: req.params.schedule_id, body: req.body });
    res.json({ status: "success", message: "Jadwal berhasil diperbarui", data: result });
  } catch (err) { next(err); }
};

// ================= HAPUS JADWAL =================
exports.deleteSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.deleteSchedule({ user: req.user, scheduleId: req.params.schedule_id });
    res.json({ status: "success", message: result.message, data: null });
  } catch (err) { next(err); }
};

// ================= BOOKING JADWAL =================
exports.bookSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.bookSchedule({ user: req.user, body: req.body });
    res.status(201).json({ status: "success", message: "Booking berhasil", data: result });
  } catch (err) { next(err); }
};

// ================= GET DAFTAR BOOKING (Dosen) =================
exports.getBookings = async (req, res, next) => {
  try {
    const result = await scheduleService.getBookings({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Daftar booking berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= BATALKAN BOOKING =================
exports.cancelBooking = async (req, res, next) => {
  try {
    const result = await scheduleService.cancelBooking({ user: req.user, bookingId: req.params.booking_id });
    res.json({ status: "success", message: result.message, data: null });
  } catch (err) { next(err); }
};

// ================= GET BOOKING MILIK MAHASISWA =================
exports.getMyBookings = async (req, res, next) => {
  try {
    const result = await scheduleService.getMyBookings({ user: req.user });
    res.json({ status: "success", message: "Riwayat booking berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= GET MONTHLY (Dosen & Mahasiswa) — data langsung array =================
exports.getMonthlySchedulesDosen = async (req, res, next) => {
  try {
    const result = await scheduleService.getMonthlySchedulesDosen({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data bulanan berhasil diambil", data: result });
  } catch (err) { next(err); }
};

exports.getMonthlySchedulesMahasiswa = async (req, res, next) => {
  try {
    const result = await scheduleService.getMonthlySchedulesMahasiswa({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data bulanan berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= GET DAILY (Dosen & Mahasiswa) — data langsung array =================
exports.getDailySchedulesDosen = async (req, res, next) => {
  try {
    const result = await scheduleService.getDailySchedulesDosen({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Detail harian berhasil diambil", data: result });
  } catch (err) { next(err); }
};

exports.getDailySchedulesMahasiswa = async (req, res, next) => {
  try {
    const result = await scheduleService.getDailySchedulesMahasiswa({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Detail harian berhasil diambil", data: result });
  } catch (err) { next(err); }
};

// ================= MAHASISWA: GET MONTHLY =================
exports.getMahasiswaMonthly = async (req, res, next) => {
  try {
    const result = await scheduleService.getMahasiswaMonthly({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data jadwal bulanan", data: result });
  } catch (err) { next(err); }
};

// ================= MAHASISWA: GET DAILY =================
exports.getMahasiswaDaily = async (req, res, next) => {
  try {
    const result = await scheduleService.getMahasiswaDaily({ user: req.user, query: req.query });
    res.json({ status: "success", message: "Data jadwal harian", data: result });
  } catch (err) { next(err); }
};

// ================= MAHASISWA: BOOK JADWAL =================
exports.mahasiswaBookSchedule = async (req, res, next) => {
  try {
    const result = await scheduleService.mahasiswaBookSchedule({ user: req.user, body: req.body });
    res.status(201).json({ status: "success", message: "Booking berhasil", data: result });
  } catch (err) { next(err); }
};

// ================= MAHASISWA: HISTORY BOOKING =================
exports.getMahasiswaBookingHistory = async (req, res, next) => {
  try {
    const result = await scheduleService.getMahasiswaBookingHistory({ user: req.user });
    res.json({ status: "success", message: "Riwayat booking berhasil diambil", data: result });
  } catch (err) { next(err); }
};
