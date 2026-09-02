const Bull = require('bull');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const ocrQueue = new Bull('document-ocr-queue', redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

ocrQueue.process(async (job) => {
  const { documentId, filePath, userId, type, semester } = job.data;
  console.log(`[OCR QUEUE] Processing background OCR job #${job.id} for doc ${documentId} (${type} sem ${semester})`);
  
  return {
    status: 'completed',
    document_id: documentId,
    processed_at: new Date().toISOString()
  };
});

ocrQueue.on('completed', (job, result) => {
  console.log(`[OCR QUEUE] Job #${job.id} finished successfully`);
});

ocrQueue.on('failed', (job, err) => {
  console.error(`[OCR QUEUE] Job #${job.id} failed with error:`, err.message);
});

module.exports = ocrQueue;
