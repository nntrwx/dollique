const nodemailer = require('nodemailer');

class EmailService {
  static transporter = null;

  static async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    // Use real SMTP if configured in .env
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return this.transporter;
    }

    // Fallback: Ethereal test account if no credentials provided
    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    return this.transporter;
  }

  // Without SMTP settings letters go to a test Ethereal inbox, not to the real address.
  // Print the link to view the letter so the confirmation / reset link can still be used.
  static logPreview(info) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`📬 [TEST INBOX] Open the letter here: ${previewUrl}`);
  }

  static async sendConfirmationEmail(email, token) {
    try {
      const transporter = await this.getTransporter();
      const confirmationUrl = `http://localhost:3000/api/auth/confirm-email/${token}`;
      const senderEmail = process.env.SMTP_USER || 'no-reply@dollique.com';

      const info = await transporter.sendMail({
        from: `"Dollique" <${senderEmail}>`,
        to: email, // Any recipient email address
        subject: 'Welcome to Dollique! Confirm your email address',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #d81b60;">Welcome to Dollique!</h2>
            <p>Thank you for joining our community of doll customizers, OOAK artists, and figure collectors.</p>
            <p>Please click the button below to confirm your email and activate your account:</p>
            <div style="margin: 25px 0;">
              <a href="${confirmationUrl}" style="background-color: #d81b60; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Confirm My Account
              </a>
            </div>
            <p style="font-size: 13px; color: #777;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 13px; color: #555; word-break: break-all;">${confirmationUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999;">Dollique Team &bull; Q&A Knowledge Hub</p>
          </div>
        `,
      });

      console.log(`📧 [EMAIL SENT] Verification email delivered to: ${email}`);
      this.logPreview(info);
    } catch (error) {
      console.error('Failed to send confirmation email via Nodemailer:', error);
    }
  }

  static async sendPasswordResetEmail(email, token) {
    try {
      const transporter = await this.getTransporter();
      const resetUrl = `http://localhost:3000/api/auth/password-reset/${token}`;
      const senderEmail = process.env.SMTP_USER || 'no-reply@dollique.com';

      const info = await transporter.sendMail({
        from: `"Dollique" <${senderEmail}>`,
        to: email,
        subject: 'Dollique: Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>We received a request to reset your password for your Dollique account.</p>
            <p>Click the button below to set a new password (valid for 1 hour):</p>
            <div style="margin: 25px 0;">
              <a href="${resetUrl}" style="background-color: #333333; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Reset My Password
              </a>
            </div>
            <p style="font-size: 13px; color: #777;">If you did not request this, please ignore this email.</p>
            <p style="font-size: 13px; color: #555; word-break: break-all;">${resetUrl}</p>
          </div>
        `,
      });

      console.log(`📧 [EMAIL SENT] Password reset email delivered to: ${email}`);
      this.logPreview(info);
    } catch (error) {
      console.error('Failed to send password reset email via Nodemailer:', error);
    }
  }
}

module.exports = EmailService;