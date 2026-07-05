const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

// ================= LOGIN LIMITER =================
exports.loginLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 60 * 1000, 
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Terlalu banyak percobaan login, coba lagi nanti"
  }
});

// ================= OTP LIMITER =================
exports.otpLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 60 * 1000,
  max: 10,
  message: {
    status: "error",
    message: "Terlalu banyak percobaan OTP"
  }
});

// ================= RESEND LIMITER =================
exports.resendLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 60 * 1000,
  max: 10,
  message: {
    status: "error",
    message: "Terlalu sering meminta OTP"
  }
});
