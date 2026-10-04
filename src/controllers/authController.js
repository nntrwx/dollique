const bcrypt = require('bcrypt');
const crypto = require('crypto');
const UserModel = require('../models/UserModel');
const EmailService = require('../services/emailService');
const TokenService = require('../services/tokenService');
const LoginLimiter = require('../services/loginLimiter');
const { validateLogin, validateEmail } = require('../utils/validators');

class AuthController {
  // POST /api/auth/register
  static async register(req, res) {
    try {
      const { login, password, password_confirmation, email, full_name } = req.body;

      // 1. Validate required fields
      if (!login || !password || !password_confirmation || !email) {
        return res.status(400).json({
          error: 'Required parameters: [login, password, password_confirmation, email].',
        });
      }

      // 2. Validate login and email format
      const formatError = validateLogin(login) || validateEmail(email);
      if (formatError) {
        return res.status(400).json({ error: formatError });
      }

      // 3. Validate password strength (minimum 6 characters)
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // 4. Validate that passwords match
      if (password !== password_confirmation) {
        return res.status(400).json({ error: 'Password and password confirmation do not match.' });
      }

      // 5. Check if login already exists
      const existingLogin = await UserModel.findByLogin(login);
      if (existingLogin) {
        return res.status(409).json({ error: 'User with this login already exists.' });
      }

      // 6. Check if email already exists
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'User with this email already exists.' });
      }

      // 7. Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // 8. Create user in database
      const newUser = await UserModel.create({
        login,
        passwordHash,
        fullName: full_name || login,
        email,
        role: 'user',
        isEmailConfirmed: false,
      });

      // 9. Generate confirmation token
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await UserModel.saveToken({
        userId: newUser.id,
        token: confirmationToken,
        type: 'email_confirm',
        expiresAt: tokenExpiresAt,
      });

      // 10. Send confirmation email
      await EmailService.sendConfirmationEmail(email, confirmationToken);

      return res.status(201).json({
        message: 'Registration successful. Please check your email to confirm your account.',
        userId: newUser.id,
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error during registration.' });
    }
  }

  // GET & POST /api/auth/confirm-email/:confirm_token
  static async confirmEmail(req, res) {
    try {
      const { confirm_token } = req.params;

      const tokenRecord = await UserModel.findToken(confirm_token, 'email_confirm');
      if (!tokenRecord) {
        return res.status(400).json({ error: 'Invalid or expired confirmation token.' });
      }

      await UserModel.confirmEmail(tokenRecord.userId);
      await UserModel.deleteToken(tokenRecord.id);

      // If clicked from browser URL, return a nice HTML confirmation
      if (req.method === 'GET') {
        return res.send(`
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #2e7d32;">🎉 Email Confirmed!</h1>
            <p>Your Dollique account has been successfully verified. You can now log in.</p>
          </div>
        `);
      }

      return res.status(200).json({ message: 'Email confirmed successfully. You can now log in.' });
    } catch (error) {
      console.error('Email confirmation error:', error);
      return res.status(500).json({ error: 'Internal server error during email confirmation.' });
    }
  }

  // POST /api/auth/login
  static async login(req, res) {
    try {
      const { login, email, password } = req.body;

      if (typeof password !== 'string' || !password || (!login && !email)
          || (login && typeof login !== 'string') || (email && typeof email !== 'string')) {
        return res.status(400).json({
          error: 'Parameters [password] and at least one of [login, email] are required.',
        });
      }

      const identifier = login || email;
      const retryAfter = LoginLimiter.retryAfter(req.ip, identifier);
      if (retryAfter > 0) {
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: `Too many failed login attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
          retryAfter,
        });
      }

      let user = null;
      if (login) {
        user = await UserModel.findByLogin(login);
      } else if (email) {
        user = await UserModel.findByEmail(email);
      }

      const isPasswordValid = user ? await bcrypt.compare(password, user.password_hash) : false;
      if (!isPasswordValid) {
        LoginLimiter.registerFailure(req.ip, identifier);
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      LoginLimiter.reset(req.ip, identifier);

      if (!user.is_email_confirmed) {
        return res.status(403).json({
          error: 'Please confirm your email before signing in.',
        });
      }

      if (UserModel.isBanned(user)) {
        return res.status(403).json({
          error: `Your account is banned until ${new Date(user.banned_until).toISOString()}.`,
          bannedUntil: user.banned_until,
          reason: user.ban_reason,
        });
      }

      const token = TokenService.sign(user);

      return res.status(200).json({
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          login: user.login,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          rating: user.rating,
          profilePicture: user.profile_picture,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error during login.' });
    }
  }

  // POST /api/auth/logout
  // Revokes every token of this user (all devices), so a stolen or old token stops working
  static async logout(req, res) {
    try {
      await UserModel.bumpTokenVersion(req.user.id);
      return res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Internal server error during logout.' });
    }
  }

  // POST /api/auth/password-reset
  static async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Parameter [email] is required.' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(200).json({
          message: 'If an account with this email exists, a reset link has been sent.',
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await UserModel.saveToken({
        userId: user.id,
        token: resetToken,
        type: 'password_reset',
        expiresAt: tokenExpiresAt,
      });

      await EmailService.sendPasswordResetEmail(email, resetToken);

      return res.status(200).json({
        message: 'Password reset link has been sent to your email.',
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      return res.status(500).json({ error: 'Internal server error during password reset request.' });
    }
  }

  // GET /api/auth/password-reset/:confirm_token - Opens reset form when clicked in email
  static async renderPasswordResetPage(req, res) {
    try {
      const { confirm_token } = req.params;
      const tokenRecord = await UserModel.findToken(confirm_token, 'password_reset');

      if (!tokenRecord) {
        return res.status(400).send(`
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #c62828;">❌ Invalid or Expired Token</h2>
            <p>This password reset link is invalid or has expired.</p>
          </div>
        `);
      }

      // Return a working HTML form that POSTs to this token
      return res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 25px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
          <form method="POST" action="/api/auth/password-reset/${confirm_token}">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">New Password:</label>
            <input type="password" name="password" required minlength="6" style="width: 100%; padding: 10px; box-sizing: border-box; margin-bottom: 15px;" placeholder="At least 6 characters" />
            
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">Confirm New Password:</label>
            <input type="password" name="password_confirmation" required minlength="6" style="width: 100%; padding: 10px; box-sizing: border-box; margin-bottom: 20px;" placeholder="Repeat password" />
            
            <button type="submit" style="width: 100%; padding: 12px; background-color: #d81b60; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Update Password</button>
          </form>
        </div>
      `);
    } catch (error) {
      console.error('Render reset page error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  // POST /api/auth/password-reset/:confirm_token - Confirm new password
  static async confirmPasswordReset(req, res) {
    try {
      const { confirm_token } = req.params;
      const { password, password_confirmation } = req.body;

      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }

      if (password_confirmation && password !== password_confirmation) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      const tokenRecord = await UserModel.findToken(confirm_token, 'password_reset');
      if (!tokenRecord) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      const newPasswordHash = await bcrypt.hash(password, 10);
      await UserModel.updatePassword(tokenRecord.userId, newPasswordHash);
      await UserModel.deleteToken(tokenRecord.id);
      // Old sessions are signed out after a password change
      await UserModel.bumpTokenVersion(tokenRecord.userId);

      return res.status(200).json({
        message: 'Password has been successfully updated. You can now log in.',
      });
    } catch (error) {
      console.error('Confirm password reset error:', error);
      return res.status(500).json({ error: 'Internal server error during password reset confirmation.' });
    }
  }
}

module.exports = AuthController;