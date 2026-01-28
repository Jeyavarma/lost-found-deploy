const nodemailer = require('nodemailer');

// Email service configuration
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        }
      });
    } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });
    } else {
      // Fallback to console logging for development
      console.log('ℹ️  Email service not configured - using console logging for development');
    }
  }

  async sendOTPEmail(email, otp) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@mcc.edu.in',
      to: email,
      subject: 'MCC Lost & Found - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B0000;">MCC Lost & Found</h2>
          <h3>Password Reset Request</h3>
          <p>You have requested to reset your password. Use the following OTP code:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #8B0000; font-size: 32px; margin: 0;">${otp}</h1>
          </div>
          <p><strong>This code expires in 10 minutes.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from MCC Lost & Found System.<br>
            Please do not reply to this email.
          </p>
        </div>
      `
    };

    if (this.transporter) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error('Failed to send OTP email:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Development fallback - log to console
      console.log('=== OTP EMAIL (Development Mode) ===');
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('=====================================');
      return { success: true, messageId: 'dev-mode' };
    }
  }

  async sendWelcomeEmail(email, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@mcc.edu.in',
      to: email,
      subject: 'Welcome to MCC Lost & Found',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8B0000;">Welcome to MCC Lost & Found!</h2>
          <p>Dear ${name},</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Report lost items</li>
            <li>Report found items</li>
            <li>Browse and search for items</li>
            <li>Contact other users</li>
          </ul>
          <p>Visit the platform: <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}">MCC Lost & Found</a></p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from MCC Lost & Found System.
          </p>
        </div>
      `
    };

    if (this.transporter) {
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
      } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error: error.message };
      }
    } else {
      console.log('=== WELCOME EMAIL (Development Mode) ===');
      console.log(`To: ${email}`);
      console.log(`Name: ${name}`);
      console.log('========================================');
      return { success: true, messageId: 'dev-mode' };
    }
  }
}

module.exports = new EmailService();