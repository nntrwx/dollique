const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Letters look like the site: paper background, a black ribbon with pink lace,
// a white logo sticker, serif headings, mono labels and a black pill button with a pink shadow.
// Only tables and inline styles, because mail apps ignore most CSS.
const C = {
  paper: '#f4f1ec', card: '#fbfaf7', ink: '#211c1f', ink2: '#5b5357', ink3: '#958c90', pink: '#ecc3cf', pinkDeep: '#c98a9c', line: '#e2dcd5',
};
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";
const SCRIPT = "'Pinyon Script', 'Snell Roundhand', 'Apple Chancery', 'Brush Script MT', cursive";

// the pixel bunny from the site, drawn as a tiny table so every mail app shows it
const BUNNY = ['...1.1.....', '...1.1.....', '...111.....', '..11111....', '..1w111....', '..111111..1', '...11111111', '...1111111.', '...11.111..'];

function pixelBunny(size = 4, color = C.pinkDeep) {
  const rows = BUNNY.map((row) => `<tr>${[...row].map((dot) => {
    let bg = 'transparent';
    if (dot === '1') bg = color;
    if (dot === 'w') bg = C.card;
    return `<td width="${size}" height="${size}" style="width:${size}px;height:${size}px;padding:0;background:${bg};font-size:0;line-height:0;"></td>`;
  }).join('')}</tr>`).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${rows}</table>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderLetter({
  preheader, label, title, accent, paragraphs, buttonText, url, note,
}) {
  const lace = '&#9679;&nbsp;&middot;&nbsp;'.repeat(40);
  const previewFiller = '&#847;&zwnj;&nbsp;'.repeat(120);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)} ${escapeHtml(accent)}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500&family=Pinyon+Script&family=Space+Mono&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<!-- the inbox preview: the letter's own words, then invisible filler so the lace never shows up there -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || paragraphs.join(' '))}${previewFiller}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

      <!-- black ribbon with the logo sticker -->
      <tr><td style="background:${C.ink};border-radius:22px 22px 0 0;padding:22px 26px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle">
            <span style="display:inline-block;padding:6px 18px 8px;background:${C.card};border-radius:12px;border-bottom:4px solid ${C.pink};font-family:${SCRIPT};font-size:30px;line-height:1;color:${C.ink};">Dollique</span>
          </td>
          <td valign="middle" align="right">${pixelBunny(4, C.pink)}</td>
        </tr></table>
      </td></tr>
      <!-- pink lace hanging under the ribbon -->
      <tr><td style="background:${C.pink};padding:3px 0 4px;overflow:hidden;white-space:nowrap;font-size:9px;line-height:9px;color:${C.ink};text-align:center;mso-line-height-rule:exactly;">
        <div style="overflow:hidden;white-space:nowrap;max-width:560px;">${lace}</div>
      </td></tr>

      <!-- the letter itself -->
      <tr><td style="background:${C.card};border-radius:0 0 22px 22px;padding:34px 34px 30px;border:1px solid ${C.line};border-top:0;">
        <div style="font-family:${MONO};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};">${escapeHtml(label)}</div>
        <h1 style="margin:14px 0 18px;font-family:${SERIF};font-weight:400;font-size:42px;line-height:1.02;letter-spacing:-.01em;color:${C.ink};">
          ${escapeHtml(title)} <em style="color:${C.pinkDeep};">${escapeHtml(accent)}</em>
        </h1>
        ${paragraphs.map((text) => `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink2};">${escapeHtml(text)}</p>`).join('')}

        <!-- button: a black pill with a pink layer printed slightly off, like on the site -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 28px;"><tr>
          <td style="background:${C.ink};border-radius:999px;border-right:4px solid ${C.pink};border-bottom:4px solid ${C.pink};">
            <a href="${url}" style="display:inline-block;padding:14px 30px;font-family:${SANS};font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">${escapeHtml(buttonText)} <span style="color:${C.pink};">&#10022;</span></a>
          </td>
        </tr></table>

        <p style="margin:0 0 6px;font-family:${MONO};font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:${C.ink3};">or open this link</p>
        <p style="margin:0 0 22px;font-family:${MONO};font-size:12px;line-height:1.5;word-break:break-all;"><a href="${url}" style="color:${C.pinkDeep};">${url}</a></p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="border-top:1px dashed ${C.line};padding-top:16px;font-family:${SANS};font-size:12.5px;line-height:1.5;color:${C.ink3};">${escapeHtml(note)}</td>
        </tr></table>
      </td></tr>

      <!-- footer -->
      <tr><td align="center" style="padding:20px 10px 0;font-family:${MONO};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.ink3};">
        Dollique &middot; questions and answers for doll people
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

class EmailService {
  static transporter = null;

  static async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

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

  static logPreview(info) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`📬 [TEST INBOX] Open the letter here: ${previewUrl}`);
  }

  static async sendConfirmationEmail(email, token) {
    try {
      const transporter = await this.getTransporter();
      const confirmationUrl = `${FRONTEND_URL}/confirm-email/${token}`;
      const senderEmail = process.env.SMTP_USER || 'no-reply@dollique.com';

      const info = await transporter.sendMail({
        from: `"Dollique" <${senderEmail}>`,
        to: email,
        subject: 'Welcome to Dollique: confirm your email',
        html: renderLetter({
          label: 'welcome to dollique',
          title: 'Hello, new',
          accent: 'doll.',
          paragraphs: [
            'Thank you for joining our little forum of OOAK artists, customizers and figure collectors.',
            'Confirm your email and your account comes to life: you can ask questions, answer, like and save posts.',
          ],
          buttonText: 'Confirm my email',
          url: confirmationUrl,
          note: 'The link works for 24 hours. If you did not sign up on Dollique, just ignore this letter.',
        }),
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
      const resetUrl = `${FRONTEND_URL}/password-reset/${token}`;
      const senderEmail = process.env.SMTP_USER || 'no-reply@dollique.com';

      const info = await transporter.sendMail({
        from: `"Dollique" <${senderEmail}>`,
        to: email,
        subject: 'Dollique: choose a new password',
        html: renderLetter({
          label: 'password reset',
          title: 'A new',
          accent: 'password?',
          paragraphs: [
            'Someone (hopefully you) asked to reset the password of your Dollique account.',
            'Press the button and choose a new one. The link works for one hour.',
          ],
          buttonText: 'Choose a new password',
          url: resetUrl,
          note: 'If you did not ask for this, ignore the letter: your password stays the same.',
        }),
      });

      console.log(`📧 [EMAIL SENT] Password reset email delivered to: ${email}`);
      this.logPreview(info);
    } catch (error) {
      console.error('Failed to send password reset email via Nodemailer:', error);
    }
  }
}


module.exports = EmailService;