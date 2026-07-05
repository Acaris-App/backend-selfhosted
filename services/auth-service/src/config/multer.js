const multer = require('multer');

// ================= MEMORY STORAGE (untuk GCS) =================
const storage = multer.memoryStorage();

// ================= FILE FILTER PDF =================
const pdfFilter = (req, file, cb) => {
  if (
    file.mimetype !== 'application/pdf' ||
    !file.originalname.toLowerCase().endsWith('.pdf')
  ) {
    return cb(new Error('Hanya file PDF yang diperbolehkan'), false);
  }
  cb(null, true);
};

// ================= FILE FILTER IMAGE =================
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan'), false);
  }
  cb(null, true);
};

// ================= UPLOAD PDF — dokumen mahasiswa (maks 2MB) =================
const uploadPDF = multer({
  storage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  }
});

// ================= UPLOAD PDF — knowledge base admin (maks 50MB) =================
const uploadPDFLarge = multer({
  storage,
  fileFilter: pdfFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1
  }
});

// ================= UPLOAD IMAGE — profile picture (maks 2MB) =================
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  }
});

module.exports = { uploadPDF, uploadPDFLarge, uploadImage };
