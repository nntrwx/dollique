const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const UserModel = require('../models/UserModel');
const NotificationModel = require('../models/NotificationModel');
const ViolationModel = require('../models/ViolationModel');
const ViolationService = require('../services/violationService');
const EmailService = require('../services/emailService');
const AvatarService = require('../services/avatarService');
const { validateLogin, validateEmail } = require('../utils/validators');

const BIO_MAX_LENGTH = 500;

const RESETTABLE_FIELDS = {
  profile_picture: 'profile picture',
  full_name: 'display name',
  bio: 'profile description',
};
// The virtual doll avatar (avatar_config) is built from site parts only, so it is never moderated

class UserController {
  // GET /api/users - Get all users
  static async getAllUsers(req, res) {
    try {
      const isAdmin = req.user && req.user.role === 'admin';
      const users = await UserModel.findAll(isAdmin);
      return res.status(200).json(users);
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching users.' });
    }
  }

  // GET /api/users/:user_id - Get specified user data
  static async getUserById(req, res) {
    try {
      const { user_id } = req.params;
      const user = await UserModel.findById(user_id);

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error('Get user by ID error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching user.' });
    }
  }

  // GET /api/users/:user_id/avatar - The doll as ordered picture layers (first = bottom)
  static async getUserAvatar(req, res) {
    try {
      const user = await UserModel.findById(req.params.user_id);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const config = AvatarService.parseStored(user.avatar_config);
      const layers = config ? await AvatarService.buildLayers(config) : [];
      return res.status(200).json({ user_id: user.id, avatar_config: config, layers });
    } catch (error) {
      console.error('Get user avatar error:', error);
      return res.status(500).json({ error: 'Internal server error while building the avatar.' });
    }
  }

  // POST /api/users - Create new user (Admin only)
  static async createUser(req, res) {
    try {
      const { login, password, password_confirmation, email, role, full_name } = req.body;

      if (!login || !password || !password_confirmation || !email || !role) {
        return res.status(400).json({
          error: 'Required parameters: [login, password, password_confirmation, email, role].',
        });
      }

      const inputError = validateLogin(login) || validateEmail(email)
        || (typeof password !== 'string' || password.length < 6 ? 'Password must be at least 6 characters long.' : null);
      if (inputError) {
        return res.status(400).json({ error: inputError });
      }

      if (password !== password_confirmation) {
        return res.status(400).json({ error: 'Password and password confirmation do not match.' });
      }

      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be either "user" or "admin".' });
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
        role,
        isEmailConfirmed: true,
      });

      return res.status(201).json({
        message: 'User created successfully by admin.',
        user: {
          id: newUser.id,
          login: newUser.login,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
        },
      });
    } catch (error) {
      console.error('Admin create user error:', error);
      return res.status(500).json({ error: 'Internal server error while creating user.' });
    }
  }

  // PATCH /api/users/avatar - Upload user avatar
  static async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;

      // If a file was uploaded via multer
      let avatarUrl = null;
      if (req.file) {
        avatarUrl = `/uploads/avatars/${req.file.filename}`;
      }

      const { avatar_config } = req.body || {};
      const updateData = {};

      if (avatarUrl) {
        updateData.profilePicture = avatarUrl;
      }

      if (avatar_config !== undefined) {
        const current = await UserModel.findById(userId);
        const { config, error } = await AvatarService.validateConfig(avatar_config, current && current.avatar_config);
        if (error) return res.status(400).json({ error });
        updateData.avatarConfig = config;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No avatar image file or avatar_config provided.' });
      }

      const updatedUser = await UserModel.updateProfile(userId, updateData);

      return res.status(200).json({
        message: 'Avatar updated successfully.',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      return res.status(500).json({ error: 'Internal server error while uploading avatar.' });
    }
  }

  // PATCH /api/users/:user_id - Update user data
  static async updateUser(req, res) {
    try {
      const targetUserId = Number(req.params.user_id);
      const requester = req.user;

      if (requester.role !== 'admin' && requester.id !== targetUserId) {
        return res.status(403).json({ error: 'Forbidden: You can only update your own profile.' });
      }

      const targetUser = await UserModel.findById(targetUserId, true);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const { login, full_name, email, role, avatar_config, bio } = req.body;
      const updateData = {};

      if (role) {
        if (requester.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden: Only admins can change user roles.' });
        }
        if (!['user', 'admin'].includes(role)) {
          return res.status(400).json({ error: 'Role must be either "user" or "admin".' });
        }
        updateData.role = role;
      }

      if (login && login !== targetUser.login) {
        const loginError = validateLogin(login);
        if (loginError) return res.status(400).json({ error: loginError });
        const existingLogin = await UserModel.findByLogin(login);
        if (existingLogin && existingLogin.id !== targetUserId) {
          return res.status(409).json({ error: 'Login is already taken.' });
        }
        updateData.login = login;
      }

      if (email && email !== targetUser.email) {
        const emailError = validateEmail(email);
        if (emailError) return res.status(400).json({ error: emailError });
        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail && existingEmail.id !== targetUserId) {
          return res.status(409).json({ error: 'Email is already taken.' });
        }
        updateData.email = email;
      }

      if (full_name) updateData.fullName = full_name;

      if (bio !== undefined) {
        const cleanBio = bio === null ? '' : String(bio).trim();
        if (cleanBio.length > BIO_MAX_LENGTH) {
          return res.status(400).json({ error: `Bio cannot exceed ${BIO_MAX_LENGTH} characters.` });
        }
        updateData.bio = cleanBio;
      }

      if (avatar_config !== undefined) {
        const { config, error } = await AvatarService.validateConfig(avatar_config, targetUser.avatar_config);
        if (error) return res.status(400).json({ error });
        updateData.avatarConfig = config;
      }

      // A user changing their own email must confirm the new address; an admin's change is trusted
      const needsConfirmation = Boolean(updateData.email) && requester.role !== 'admin';
      if (updateData.email && !needsConfirmation) updateData.keepEmailConfirmed = true;

      const updatedUser = await UserModel.updateProfile(targetUserId, updateData);

      if (needsConfirmation) {
        const confirmationToken = crypto.randomBytes(32).toString('hex');
        await UserModel.saveToken({
          userId: targetUserId,
          token: confirmationToken,
          type: 'email_confirm',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
        await EmailService.sendConfirmationEmail(updateData.email, confirmationToken);
      }

      return res.status(200).json({
        message: needsConfirmation
          ? 'Profile updated. Please confirm your new email: a link was sent to it.'
          : 'Profile updated successfully.',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'Internal server error while updating user.' });
    }
  }

  // POST /api/users/:user_id/profile-reset - Admin resets inappropriate profile data
  static async resetProfile(req, res) {
    try {
      const targetUserId = Number(req.params.user_id);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user_id format.' });
      }

      const { fields, reason } = req.body;
      const requested = Array.isArray(fields) ? fields : (fields ? String(fields).split(',') : []);
      const cleanFields = [...new Set(requested.map((f) => String(f).trim()))];

      if (cleanFields.length === 0) {
        return res.status(400).json({
          error: `Required parameter: [fields]. Allowed values: ${Object.keys(RESETTABLE_FIELDS).join(', ')}.`,
        });
      }
      const unknown = cleanFields.filter((f) => !RESETTABLE_FIELDS[f]);
      if (unknown.length > 0) {
        return res.status(400).json({
          error: `Unknown fields: [${unknown.join(', ')}]. Allowed values: ${Object.keys(RESETTABLE_FIELDS).join(', ')}.`,
        });
      }
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ error: 'Required parameter: [reason].' });
      }

      const targetUser = await UserModel.findById(targetUserId, true);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const updatedUser = await UserModel.resetProfileFields(targetUserId, cleanFields);

      // Remove the uploaded file so the inappropriate image is not served anymore
      const oldPicture = targetUser.profile_picture;
      if (cleanFields.includes('profile_picture') && oldPicture
          && oldPicture.startsWith('/uploads/avatars/') && oldPicture !== UserModel.DEFAULT_AVATAR) {
        const filePath = path.join(__dirname, '../..', oldPicture);
        fs.promises.unlink(filePath).catch(() => {});
      }

      const resetNames = cleanFields.map((f) => RESETTABLE_FIELDS[f]).join(', ');
      await NotificationModel.create({
        userId: targetUserId,
        type: 'profile_reset',
        message: `A moderator reset your ${resetNames}. Reason: ${String(reason).trim()}`,
      });
      await ViolationService.record({
        userId: targetUserId, type: 'profile_reset', targetId: null,
        reason: `${resetNames}: ${String(reason).trim()}`, adminId: req.user.id,
      });

      return res.status(200).json({
        message: `Profile reset: ${resetNames}. The user has been notified.`,
        user: updatedUser,
      });
    } catch (error) {
      console.error('Reset profile error:', error);
      return res.status(500).json({ error: 'Internal server error while resetting profile.' });
    }
  }

  // GET /api/users/:user_id/violations - Strike history (admin or the user)
  static async getViolations(req, res) {
    try {
      const targetUserId = Number(req.params.user_id);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user_id format.' });
      }
      if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
        return res.status(403).json({ error: 'Forbidden: You can only see your own violations.' });
      }

      const targetUser = await UserModel.findById(targetUserId, true);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const resetAt = await UserModel.getStrikesResetAt(targetUserId);
      return res.status(200).json({
        activeStrikes: await ViolationService.activeStrikes(targetUserId),
        banStrikes: ViolationService.banStrikes,
        bannedUntil: UserModel.isBanned(targetUser) ? targetUser.banned_until : null,
        banReason: UserModel.isBanned(targetUser) ? targetUser.ban_reason : null,
        // counts = false for strikes that were cancelled or given before the last ban
        violations: (await ViolationModel.findByUser(targetUserId)).map((v) => ({
          ...v,
          counts: !v.revoked && (!resetAt || new Date(v.createdAt) > new Date(resetAt)),
        })),
      });
    } catch (error) {
      console.error('Get violations error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching violations.' });
    }
  }

  // POST /api/users/:user_id/ban - Manual ban (Admin only)
  static async banUser(req, res) {
    try {
      const targetUserId = Number(req.params.user_id);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user_id format.' });
      }

      const days = req.body.days === undefined ? ViolationService.banDays : Number(req.body.days);
      const reason = String(req.body.reason || '').trim();
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return res.status(400).json({ error: 'Parameter [days] must be a whole number from 1 to 365.' });
      }
      if (!reason) {
        return res.status(400).json({ error: 'Required parameter: [reason].' });
      }

      const targetUser = await UserModel.findById(targetUserId, true);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }
      if (targetUser.role === 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins cannot be banned.' });
      }

      const user = await ViolationService.ban(targetUserId, days, reason);
      return res.status(200).json({ message: `User ${user.login} is banned for ${days} day(s).`, user });
    } catch (error) {
      console.error('Ban user error:', error);
      return res.status(500).json({ error: 'Internal server error while banning user.' });
    }
  }

  // DELETE /api/users/:user_id/ban - Lift the ban early (Admin only)
  static async unbanUser(req, res) {
    try {
      const targetUserId = Number(req.params.user_id);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user_id format.' });
      }

      const targetUser = await UserModel.findById(targetUserId, true);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }
      if (!UserModel.isBanned(targetUser)) {
        return res.status(400).json({ error: 'This user is not banned.' });
      }

      const user = await ViolationService.unban(targetUserId);
      return res.status(200).json({ message: `User ${user.login} is unbanned.`, user });
    } catch (error) {
      console.error('Unban user error:', error);
      return res.status(500).json({ error: 'Internal server error while unbanning user.' });
    }
  }

  // DELETE /api/users/:user_id - Delete user
  static async deleteUser(req, res) {
    try {
      const targetUserId = Number(req.params.user_id);
      const requester = req.user;

      if (requester.role !== 'admin' && requester.id !== targetUserId) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own account.' });
      }

      const targetUser = await UserModel.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      await UserModel.delete(targetUserId);

      return res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting user.' });
    }
  }
}

module.exports = UserController;