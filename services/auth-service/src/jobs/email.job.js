const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const emailQueue = require('../config/queue');
const { sendOTPEmail } = require('../utils/email');

emailQueue.process(async (job) => {
  try {
    console.log("PROCESSING EMAIL QUEUE JOB:", job.data);
    const { to, code, type } = job.data;
    await sendOTPEmail(to, code, type || 'login');
    console.log("✅ QUEUED EMAIL SENT SUCCESSFULLY VIA UNIFIED ENGINE");
  } catch (err) {
    console.error("❌ QUEUED EMAIL DISPATCH ERROR:", err.message);
  }
});
