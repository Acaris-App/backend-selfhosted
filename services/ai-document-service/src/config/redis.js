const Redis = require('ioredis');

const redisOptions = {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  }
};

if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('rediss://')) {
  redisOptions.tls = {};
}

const redis = new Redis(process.env.REDIS_URL, redisOptions);

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

module.exports = redis;
