const nodemailer = require('nodemailer');
const config = require('./environment');

let transporter = null;

// Initialize email service if credentials are provided
if (config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASS) {
  transporter = nodemailer.createTransporter({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS
    }
  });
  console.log('✅ Email service configured');
} else {
  console.log('ℹ️  Email service not configured - using console logging');
}

const sendEmail = async (to, subject, text, html) => {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.EMAIL_USER,
        to,
        subject,
        text,
        html
      });
      console.log(`📧 Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error('Email send error:', error);
    }
  } else {
    // Log to console if no email service
    console.log(`📧 [EMAIL] To: ${to}, Subject: ${subject}, Message: ${text}`);
  }
};

module.exports = { sendEmail, isConfigured: !!transporter };