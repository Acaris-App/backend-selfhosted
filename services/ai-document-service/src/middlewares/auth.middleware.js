const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "Token tidak ditemukan"
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Format token salah"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        status: "error",
        message: "Token tidak valid atau expired"
      });
    }

    req.user = decoded;
    req.token = token;

    next();

  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Token tidak valid atau expired"
    });
  }
};
