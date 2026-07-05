const Joi = require('joi');

// 🎓 MAHASISWA
const mahasiswaSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('mahasiswa').required(),
  npm_nip: Joi.string().required(),
  angkatan: Joi.number().required(),
  kode_kelas: Joi.string().required(),
  ipk: Joi.number().min(0).max(4).required(),
  current_semester: Joi.number().min(1).required(),
  profile_picture: Joi.string().allow('', null).optional()
});

// 👨‍🏫 DOSEN
const dosenSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('dosen').required(),
  npm_nip: Joi.string().required(),
  profile_picture: Joi.string().allow('', null).optional()
});

// 👨‍💼 ADMIN
const adminSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin').required(),
  npm_nip: Joi.string().required()
});

exports.validateRegister = (data) => {

  if (data.role === 'mahasiswa') {
    return mahasiswaSchema.validate(data);
  }

  if (data.role === 'dosen') {
    return dosenSchema.validate(data);
  }

  if (data.role === 'admin') {
    return adminSchema.validate(data);
  }

  return { error: { details: [{ message: "Role tidak valid" }] } };
};