const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // Fallback to cwd

const nodemailer = require('nodemailer');

// Clean App Password by removing spaces
const getCleanEmailPass = () => {
  return (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
};

const getEmailUser = () => {
  return (process.env.EMAIL_USER || 'marsneedduitbanget@gmail.com').trim();
};

// Nodemailer transport instance
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: getEmailUser(),
      pass: getCleanEmailPass()
    },
    connectionTimeout: 8000
  });
};

// ================= EMAIL TEMPLATE =================
const generateOTPTemplate = (code) => {
  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #d9d9d9; border-radius: 12px; overflow: hidden; background-color: #ffffff;">

    <div style="background-color: #ffffff; padding: 30px 20px 15px 20px; text-align: center; border-bottom: 1px solid #f0f0f0;">
      <img src="https://raw.githubusercontent.com/Aku-Mars/gambar/refs/heads/main/logo-acaris.png" 
           alt="Acaris Logo" 
           style="width: 80px; height: auto; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">
      <h1 style="color: #1A1A1A; margin: 0; font-size: 24px; font-weight: 600;">Acaris</h1>
    </div>

    <div style="padding: 30px; background-color: #ffffff; text-align: center;">
      <h2 style="color: #1A1A1A; margin-bottom: 10px; font-weight: 600;">Verifikasi Kode OTP</h2>
      <p style="color: #666666; font-size: 16px; margin-bottom: 25px;">
        Gunakan kode di bawah ini untuk melanjutkan proses Anda.
      </p>

      <div style="background-color: #f3f3f3; padding: 15px 25px; border-radius: 8px; display: inline-block; border: 1px solid #d9d9d9;">
        <span style="font-size: 32px; font-weight: bold; color: #1A1A1A; letter-spacing: 5px;">${code}</span>
      </div>

      <p style="color: #9d9999; font-size: 14px; margin-top: 25px;">
        Kode ini hanya berlaku selama <strong>5 menit</strong>.<br>
        Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
      </p>
    </div>

    <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #d9d9d9;">
      <p style="color: #7f7f7f; font-size: 12px; margin: 0;">
        &copy; 2026 Acaris System. All rights reserved.
      </p>
    </div>

  </div>
  `;
};

// ================= SEND VIA CLOUDFLARE RELAY =================
async function sendViaRelay(to, subject, html, text) {
  const relayUrl = process.env.MAIL_RELAY_URL || 'https://mail-relay.freyxylia.workers.dev';
  const relayKey = process.env.MAIL_RELAY_KEY || 'flowra-relay-secret-2026';
  
  const payload = {
    user: getEmailUser(),
    pass: getCleanEmailPass(),
    to,
    subject,
    html,
    text,
    fromName: 'Acaris System'
  };

  const res = await fetch(relayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-relay-key': relayKey
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Relay response error ${res.status}: ${errText}`);
  }

  return await res.json();
}

// ================= SEND OTP EMAIL =================
exports.sendOTPEmail = async (to, code, type = 'login') => {

  const subjectMap = {
    login: "OTP Login Acaris",
    register: "OTP Verifikasi Akun",
    reset_password: "OTP Reset Password"
  };
  const subject = subjectMap[type] || "OTP Acaris";
  const htmlContent = generateOTPTemplate(code);
  const textContent = `Kode OTP Acaris Anda adalah: ${code}. Berlaku selama 5 menit. Jika bukan Anda yang meminta, abaikan pesan ini.`;

  let sentSuccessfully = false;
  let lastError = null;

  // Tier 1: Direct SMTP via Nodemailer
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: {
        name: 'Acaris System',
        address: getEmailUser()
      },
      to,
      subject,
      text: textContent,
      html: htmlContent
    });
    console.log("✅ EMAIL SENT VIA NODEMAILER:", info.response);
    sentSuccessfully = true;
  } catch (err) {
    console.warn("⚠️ Nodemailer direct failed, attempting Cloudflare Relay:", err.message);
    lastError = err;

    // Tier 2: Cloudflare Mail Relay (bypasses VPS port blocks)
    try {
      await sendViaRelay(to, subject, htmlContent, textContent);
      console.log("✅ EMAIL SENT VIA CLOUDFLARE RELAY");
      sentSuccessfully = true;
    } catch (relayErr) {
      console.error("❌ CLOUDFLARE RELAY ALSO FAILED:", relayErr.message);
      lastError = relayErr;
    }
  }

  // Tier 3: Record Outbound Log & Dispatch Telegram Notification (Topic #6411)
  try {
    const inboxKey = process.env.ACARIS_INBOX_KEY || 'effb0fd32bf0b26c442f3e950527591ee95655f2566cabe2';
    await fetch(`https://acaris-inbox.freyxylia.workers.dev/api/log-outbound?key=${inboxKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        to,
        from: 'no-reply@acaris.my.id',
        subject,
        body: textContent,
        code
      })
    });
  } catch (logErr) {
    console.debug("[Telemetry] Failed to log outbound email to D1:", logErr.message);
  }

  if (!sentSuccessfully && lastError) {
    throw lastError;
  }
};
