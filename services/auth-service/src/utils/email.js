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

const getEmailFrom = () => {
  return (process.env.EMAIL_FROM || 'no-reply@acaris.my.id').trim();
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
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">

    <!-- Brand Header -->
    <div style="background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); padding: 32px 24px 20px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
      <img src="https://raw.githubusercontent.com/Aku-Mars/gambar/refs/heads/main/logo-acaris.png" 
           alt="Acaris Logo" 
           style="width: 72px; height: auto; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto;">
      <h1 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Acaris</h1>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px 24px; background-color: #ffffff; text-align: center;">
      
      <!-- Aca Mascot Assistant Badge -->
      <div style="margin-bottom: 20px;">
        <img src="https://marsy.my.id/portofolio/img/aca_avatar.png" 
             alt="Aca - Academic Care Assistant" 
             style="width: 64px; height: 64px; border-radius: 50%; box-shadow: 0 4px 12px rgba(37,99,235,0.15); border: 2.5px solid #3b82f6; display: block; margin: 0 auto 8px auto;">
        <span style="font-size: 12px; font-weight: 600; color: #2563eb; background-color: #eff6ff; padding: 4px 12px; border-radius: 9999px; display: inline-block; border: 1px solid #dbeafe;">
          Aca &bull; Academic Care Assistant
        </span>
      </div>

      <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Verifikasi Kode OTP</h2>
      <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">
        Gunakan kode verifikasi berikut untuk melanjutkan proses autentikasi Anda di sistem Acaris.
      </p>

      <!-- OTP Code Badge -->
      <div style="background-color: #f8fafc; padding: 16px 28px; border-radius: 12px; display: inline-block; border: 1.5px solid #cbd5e1; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
        <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 700; color: #0f172a; letter-spacing: 6px; display: inline-block;">${code}</span>
      </div>

      <p style="color: #94a3b8; font-size: 13px; margin: 24px 0 0 0; line-height: 1.5;">
        Kode ini hanya berlaku selama <strong style="color: #475569;">5 menit</strong>.<br>
        Jika Anda tidak pernah meminta kode ini, abaikan pesan ini dengan aman.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #f1f5f9;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        &copy; 2026 Acaris Academic System. All rights reserved.
      </p>
    </div>

  </div>
  `;
};

// ================= SEND VIA CLOUDFLARE RELAY =================
async function sendViaRelay(to, subject, html, text) {
  const relayUrl = process.env.MAIL_RELAY_URL || 'https://mail-relay.freyxylia.workers.dev';
  const relayKey = process.env.MAIL_RELAY_KEY || '060a88da40c2cb236ee1c02b1f84fe627b2b71d8d15efb67318997df559dfcb2';
  
  const payload = {
    user: getEmailUser(),
    pass: getCleanEmailPass(),
    to,
    from: getEmailFrom(),
    fromName: 'Acaris System',
    replyTo: getEmailFrom(),
    subject,
    html,
    text
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
  const textContent = `Halo! Kode OTP Acaris Anda adalah: ${code}. Berlaku selama 5 menit. Jika bukan Anda yang meminta, abaikan pesan ini. - Aca Academic Care Assistant`;

  let sentSuccessfully = false;
  let lastError = null;

  // Tier 1: Direct SMTP via Nodemailer
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: {
        name: 'Acaris System',
        address: getEmailFrom()
      },
      replyTo: getEmailFrom(),
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
        from: getEmailFrom(),
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
