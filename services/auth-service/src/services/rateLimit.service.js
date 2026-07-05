const redis = require('../config/redis');

// ================= CHECK LOGIN LIMIT =================
// Pakai Redis agar konsisten di multi-instance Cloud Run
exports.checkLoginLimit = async (ip) => {

  const userIP = ip || 'unknown';
  const key = `login_attempts:${userIP}`;
  const windowSec = 60;
  const maxAttempts = 5;

  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  await redis.zremrangebyscore(key, '-inf', windowStart);

  const attempts = await redis.zcard(key);

  if (attempts >= maxAttempts) {
    throw {
      status: 429,
      message: "Terlalu banyak percobaan login, coba lagi nanti"
    };
  }

  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, windowSec);
};
