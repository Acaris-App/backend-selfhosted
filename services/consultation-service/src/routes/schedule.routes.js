const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const scheduleController = require('../controllers/schedule.controller');

// ================= DOSEN =================

router.get('/my', authenticate, authorize('dosen'), scheduleController.getMySchedules);

router.post('/', authenticate, authorize('dosen'), scheduleController.createSchedule);

router.put('/:schedule_id', authenticate, authorize('dosen'), scheduleController.updateSchedule);

router.delete('/:schedule_id', authenticate, authorize('dosen'), scheduleController.deleteSchedule);

// Query opsional: ?jadwal_id=5 untuk filter per jadwal
router.get('/bookings', authenticate, authorize('dosen'), scheduleController.getBookings);

// ================= MAHASISWA =================

router.get('/available', authenticate, authorize('mahasiswa'), scheduleController.getAvailableSchedules);

router.post('/book', authenticate, authorize('mahasiswa'), scheduleController.bookSchedule);

router.get('/my-bookings', authenticate, authorize('mahasiswa'), scheduleController.getMyBookings);

router.patch('/bookings/:booking_id/cancel', authenticate, authorize('mahasiswa', 'dosen'), scheduleController.cancelBooking);

// ================= MAHASISWA (prefix /mahasiswa/) =================

router.get('/mahasiswa/monthly', authenticate, authorize('mahasiswa'), scheduleController.getMahasiswaMonthly);

router.get('/mahasiswa/daily', authenticate, authorize('mahasiswa'), scheduleController.getMahasiswaDaily);

// Validasi: 1 slot per hari per mahasiswa
router.post('/mahasiswa/book', authenticate, authorize('mahasiswa'), scheduleController.mahasiswaBookSchedule);

router.get('/mahasiswa/bookings/history', authenticate, authorize('mahasiswa'), scheduleController.getMahasiswaBookingHistory);

// ================= SHARED (Dosen & Mahasiswa) =================

router.get('/monthly',
  authenticate,
  (req, res, next) => {
    if (req.user.role === 'dosen') return scheduleController.getMonthlySchedulesDosen(req, res, next);
    if (req.user.role === 'mahasiswa') return scheduleController.getMonthlySchedulesMahasiswa(req, res, next);
    res.status(403).json({ status: "error", message: "Akses ditolak" });
  }
);

router.get('/daily',
  authenticate,
  (req, res, next) => {
    if (req.user.role === 'dosen') return scheduleController.getDailySchedulesDosen(req, res, next);
    if (req.user.role === 'mahasiswa') return scheduleController.getDailySchedulesMahasiswa(req, res, next);
    res.status(403).json({ status: "error", message: "Akses ditolak" });
  }
);

// Get detail satu jadwal
router.get('/:schedule_id', authenticate, scheduleController.getScheduleDetail);

module.exports = router;
