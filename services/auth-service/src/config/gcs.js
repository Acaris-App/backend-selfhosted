const { Storage } = require('@google-cloud/storage');

let bucket = null;

if (process.env.STORAGE_TYPE !== 'local') {
  const storage = new Storage();
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) {
    throw new Error('GCS_BUCKET belum diset');
  }
  bucket = storage.bucket(bucketName);
}

module.exports = { bucket };

