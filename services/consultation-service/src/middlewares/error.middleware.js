const multer = require('multer');

exports.errorHandler = (err, req, res, next) => {

  console.error(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: "error", message: "Ukuran file melebihi batas yang diizinkan" });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ status: "error", message: `Field file tidak dikenali: ${err.field}` });
    }
    return res.status(400).json({ status: "error", message: `Upload error: ${err.message}` });
  }

  if (
    err.message === 'Hanya file PDF yang diperbolehkan' ||
    err.message === 'Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan'
  ) {
    return res.status(400).json({ status: "error", message: err.message });
  }

  const isOperational = err.status && err.status < 500;
  return res.status(err.status || 500).json({
    status: "error",
    message: isOperational ? (err.message || "Terjadi kesalahan") : "Internal Server Error"
  });
};