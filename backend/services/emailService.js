const axios = require('axios');

// EmailJS service configuration
class EmailService {
  constructor() {
    this.emailjsConfig = {
      serviceId: process.env.EMAILJS_SERVICE_ID,
      templateId: process.env.EMAILJS_TEMPLATE_ID,
      publicKey: process.env.EMAILJS_PUBLIC_KEY,
      privateKey: process.env.EMAILJS_PRIVATE_KEY
    };
  }

  async sendOTPEmail(email, otp) {
    if (!this.emailjsConfig.serviceId || !this.emailjsConfig.templateId) {
      // Fallback to console logging for development
      console.log('=== OTP EMAIL (Development Mode) ===');
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('=====================================');
      return { success: true, messageId: 'dev-mode' };
    }

    try {
      const templateParams = {
        to_email: email,
        otp_code: otp,
        to_name: email.split('@')[0]
      };

      const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
        service_id: this.emailjsConfig.serviceId,
        template_id: this.emailjsConfig.templateId,
        user_id: this.emailjsConfig.publicKey,
        accessToken: this.emailjsConfig.privateKey,
        template_params: templateParams
      });

      console.log('OTP email sent via EmailJS:', response.status);
      return { success: true, messageId: 'emailjs-sent' };
    } catch (error) {
      console.error('Failed to send OTP via EmailJS:', error.message);
      // Fallback to console logging
      console.log('=== OTP EMAIL (Fallback) ===');
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log('===============================');
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, name) {
    // For now, just log welcome emails
    console.log('=== WELCOME EMAIL ===');
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log('====================');
    return { success: true, messageId: 'dev-mode' };
  }
}

module.exports = new EmailService();