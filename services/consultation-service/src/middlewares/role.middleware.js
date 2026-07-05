exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Akses ditolak (role tidak diizinkan)"
      });
    }

    next();
  };
};