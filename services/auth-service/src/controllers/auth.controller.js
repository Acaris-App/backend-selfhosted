const authService = require('../services/auth.service');

// ================= VALIDATE KODE KELAS =================
exports.validateKodeKelas = async (req, res, next) => {
  try {
    const result = await authService.validateKodeKelas(req.body);

    res.status(200).json({
      status: "success",
      message: result.message,
      data: result.data
    });

  } catch (err) {
    next(err);
  }
};

// ================= LOGIN =================
exports.login = async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      ip: req.ip
    });

    res.status(200).json({
      status: "success",
      message: "Login berhasil",
      data: {
        token: result.token,
        role: result.role,
        user: result.user
      }
    });

  } catch (err) {
    next(err);
  }
};

// ================= REGISTER MAHASISWA =================
exports.registerMahasiswa = async (req, res, next) => {
  try {
    const result = await authService.registerMahasiswa(req.body, req.file);

    res.status(201).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= REGISTER DOSEN =================
exports.registerDosen = async (req, res, next) => {
  try {
    const result = await authService.registerDosen(req.body, req.file);

    res.status(201).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= VERIFY REGISTER OTP =================
exports.verifyRegisterOTP = async (req, res, next) => {
  try {
    const result = await authService.verifyRegisterOTP(req.body);

    res.status(200).json({
      status: "success",
      message: result.message,
      data: {
        token: result.token,
        role: result.role,
        user: result.user
      }
    });

  } catch (err) {
    next(err);
  }
};

// ================= RESEND OTP =================
exports.resendOTP = async (req, res, next) => {
  try {
    const result = await authService.resendOTP(req.body);

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= VERIFY RESET OTP =================
exports.verifyResetOTP = async (req, res, next) => {
  try {
    const result = await authService.verifyResetOTP(req.body);

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword({
      userId: req.user.id,
      ...req.body
    });

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};

// ================= LOGOUT =================
exports.logout = async (req, res, next) => {
  try {
    const result = await authService.logout({
      token: req.token,
      exp: req.user.exp
    });

    res.status(200).json({
      status: "success",
      message: result.message
    });

  } catch (err) {
    next(err);
  }
};
