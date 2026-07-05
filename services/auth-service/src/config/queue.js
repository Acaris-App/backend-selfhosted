const Queue = require('bull');

if (process.env.DISABLE_QUEUE === 'true') {
  const dummyQueue = {
    add: async (data) => {
      console.log('📭 [QUEUE DISABLED] Job tidak dikirim ke queue:', data);
    },
    process: () => {},
    on: () => {}
  };
  module.exports = dummyQueue;
} else {
  const emailQueue = new Queue('email-queue', {
    createClient: () => {
      const Redis = require('ioredis');
      const redisOptions = {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        connectTimeout: 10000,
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        }
      };
      if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('rediss://')) {
        redisOptions.tls = {};
      }
      return new Redis(process.env.REDIS_URL, redisOptions);
    }
  });

  module.exports = emailQueue;
}
