const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const controller = require('../controllers/academic.controller');

const authenticateCallback = (req, res, next) => {
  const expected = process.env.N8N_ACADEMIC_CALLBACK_SECRET;
  if (!expected || req.get('x-academic-callback-secret') !== expected) {
    return res.status(401).json({ status: 'error', message: 'Callback tidak terautentikasi' });
  }
  return next();
};

router.get('/summary', authenticate, controller.summary);
router.get('/courses', authenticate, controller.courses);
router.get('/recommendations', authenticate, controller.recommendations);
router.get('/academicsummary', authenticate, controller.summary);
router.get('/academiccourses', authenticate, controller.courses);
router.get('/academicrecommendations', authenticate, controller.recommendations);
router.post('/internal/import-khs', authenticateCallback, controller.importKhs);
router.post('/internal/import-curriculum', authenticateCallback, controller.importCurriculum);
router.post('/academicinternal/import-khs', authenticateCallback, controller.importKhs);
router.post('/academicinternal/import-curriculum', authenticateCallback, controller.importCurriculum);

module.exports = router;
