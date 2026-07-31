// backend/src/utils/email.service.js
const nodemailer = require("nodemailer");

const logger = require("./logger");

/**
 * Creates an SMTP transporter using environment variables.
 * Configured for Mailtrap (or any generic SMTP provider).
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends an email using the configured SMTP transporter.
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body of the email
 */
const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SwiftChat" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`[EMAIL] Message sent: ${info.messageId} to ${to}`);
  return info;
};

/**
 * Builds the Sentient Prism-themed HTML email for the Neural Link (password reset).
 * @param {string} resetUrl - The full password reset URL to embed in the email
 * @returns {string} - Rendered HTML string
 */
const buildResetPasswordEmail = (resetUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #060e20;
      font-family: 'Inter', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #e2e8f0;
    }

    .wrapper {
      background-color: #060e20;
      padding: 48px 16px;
      min-height: 100vh;
    }

    .container {
      max-width: 560px;
      margin: 0 auto;
      background: linear-gradient(145deg, rgba(20,36,73,0.6), rgba(8,19,41,0.9));
      border: 1px solid rgba(172, 138, 255, 0.2);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 0 60px rgba(124, 58, 237, 0.2), 0 20px 40px rgba(0,0,0,0.5);
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #0f1f45, #1a1040);
      padding: 40px 40px 32px;
      text-align: center;
      border-bottom: 1px solid rgba(172,138,255,0.15);
      position: relative;
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.25) 0%, transparent 70%);
      pointer-events: none;
    }

    .logo-icon {
      display: inline-block;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #7c3aed, #a855f7, #ec4899);
      border-radius: 16px;
      margin-bottom: 20px;
      box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
      transform: rotate(12deg);
      line-height: 56px;
      text-align: center;
      font-size: 28px;
    }

    .header h1 {
      font-family: 'Space Grotesk', Arial, sans-serif;
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, #ffffff, #c4b5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 6px;
      letter-spacing: -0.3px;
    }

    .header p {
      font-size: 13px;
      color: #94a3b8;
      letter-spacing: 0.04em;
      font-weight: 500;
      text-transform: uppercase;
    }

    /* Body */
    .body {
      padding: 40px;
    }

    .greeting {
      font-size: 15px;
      color: #94a3b8;
      margin-bottom: 20px;
      line-height: 1.6;
    }

    .signal-box {
      background: rgba(124, 58, 237, 0.08);
      border: 1px solid rgba(124, 58, 237, 0.25);
      border-left: 3px solid #a855f7;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
    }

    .signal-box p {
      font-size: 14px;
      color: #c4b5fd;
      line-height: 1.7;
    }

    .cta-container {
      text-align: center;
      margin: 32px 0;
    }

    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: #ffffff !important;
      text-decoration: none;
      font-family: 'Space Grotesk', Arial, sans-serif;
      font-weight: 600;
      font-size: 15px;
      padding: 16px 36px;
      border-radius: 14px;
      letter-spacing: 0.01em;
      box-shadow: 0 0 30px rgba(124, 58, 237, 0.45), 0 4px 15px rgba(0,0,0,0.3);
      transition: box-shadow 0.3s;
    }

    .expiry-note {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      margin-top: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin: 32px 0;
    }

    .fallback-section {
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 16px 20px;
    }

    .fallback-section p {
      font-size: 12px;
      color: #64748b;
      line-height: 1.7;
    }

    .fallback-section .reset-url {
      font-size: 11px;
      color: #7c3aed;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      margin-top: 8px;
      display: block;
    }

    /* Footer */
    .footer {
      padding: 24px 40px;
      border-top: 1px solid rgba(255,255,255,0.06);
      text-align: center;
    }

    .footer p {
      font-size: 11px;
      color: #475569;
      line-height: 1.7;
    }

    .footer .brand {
      color: #7c3aed;
      font-weight: 600;
    }

    .security-warning {
      background: rgba(239, 68, 68, 0.07);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }

    .security-warning p {
      font-size: 12px;
      color: #f87171;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">

      <!-- Header -->
      <div class="header">
        <div class="logo-icon">✦</div>
        <h1>SwiftChat</h1>
        <p>Reset Your Password</p>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">
          A request has been detected on the network to reset your <strong style="color: #c4b5fd;">Password</strong>.
          If you initiated this, proceed below to restore full access to your node.
        </p>

        <div class="signal-box">
          <p>
            ✦ &nbsp;<strong>Signal Intercepted:</strong> A request has been made to Reset Your Password.
            This token will expire in <strong>10 minutes</strong>. If you did not initiate this, you may safely ignore this transmission.
          </p>
        </div>

        <div class="security-warning">
          <p>
            🛡 &nbsp;Never share this link with anyone. SwiftChat support will <strong>never</strong> ask for your reset token.
          </p>
        </div>

        <div class="cta-container">
          <a href="${resetUrl}" class="cta-btn">
            ⚡ Reset Your Password
          </a>
          <p class="expiry-note">
            ⏱ This link expires in <strong style="color: #a855f7;">10 minutes</strong>
          </p>
        </div>

        <hr class="divider" />

        <div class="fallback-section">
          <p>If the button above isn't working, copy and paste this URL into your browser:</p>
          <span class="reset-url">${resetUrl}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>
          This message was sent by <span class="brand">SwiftChat </span>.<br />
          If you did not request a password reset, no action is required — your account remains secure.<br />
          © ${new Date().getFullYear()} SwiftChat. All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
};

module.exports = { createTransporter, sendEmail, buildResetPasswordEmail };
