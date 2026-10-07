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

      if (!login || !password || !password_confirmation || !email) {
        return res.status(400).json({
          error: 'Required parameters: [login, password, password_confirmation, email].',
        });
      }

      const formatError = validateLogin(login) || validateEmail(email);
      if (formatError) {
        return res.status(400).json({ error: formatError });
      }

      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      if (password !== password_confirmation) {
        return res.status(400).json({ error: 'Password and password confirmation do not match.' });
      }

      const existingLogin = await UserModel.findByLogin(login);
      if (existingLogin) {
        return res.status(409).json({ error: 'User with this login already exists.' });
      }

      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'User with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await UserModel.create({
        login,
        passwordHash,
        fullName: full_name || login,
        email,
        role: 'user',
        isEmailConfirmed: false,
      });

      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await UserModel.saveToken({
        userId: newUser.id,
        token: confirmationToken,
        type: 'email_confirm',
        expiresAt: tokenExpiresAt,
      });

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

  // GET /api/auth/password-reset/:confirm_token
  static async checkPasswordResetToken(req, res) {
    try {
      const { confirm_token } = req.params;
      const tokenRecord = await UserModel.findToken(confirm_token, 'password_reset');

      if (!tokenRecord) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      return res.status(200).json({
        message: 'Token is valid. Send POST to this URL with password and password_confirmation.',
      });
    } catch (error) {
      console.error('Check reset token error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  }

  // POST /api/auth/password-reset/:confirm_token
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