const bcrypt = require('bcrypt');
const UserModel = require('../models/UserModel');

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

  // POST /api/users - Create new user (Admin only)
  static async createUser(req, res) {
    try {
      const { login, password, password_confirmation, email, role, full_name } = req.body;

      if (!login || !password || !password_confirmation || !email || !role) {
        return res.status(400).json({
          error: 'Required parameters: [login, password, password_confirmation, email, role].',
        });
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

      const { avatar_config } = req.body;
      const updateData = {};

      if (avatarUrl) {
        updateData.profilePicture = avatarUrl;
      }

      if (avatar_config) {
        try {
          updateData.avatarConfig = typeof avatar_config === 'string' ? JSON.parse(avatar_config) : avatar_config;
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON format for avatar_config.' });
        }
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

      const targetUser = await UserModel.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const { login, full_name, email, role, avatar_config } = req.body;
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
        const existingLogin = await UserModel.findByLogin(login);
        if (existingLogin) {
          return res.status(409).json({ error: 'Login is already taken.' });
        }
        updateData.login = login;
      }

      if (email && email !== targetUser.email) {
        const existingEmail = await UserModel.findByEmail(email);
        if (existingEmail) {
          return res.status(409).json({ error: 'Email is already taken.' });
        }
        updateData.email = email;
      }

      if (full_name) updateData.fullName = full_name;

      if (avatar_config) {
        updateData.avatarConfig = typeof avatar_config === 'string' ? JSON.parse(avatar_config) : avatar_config;
      }

      const updatedUser = await UserModel.updateProfile(targetUserId, updateData);

      return res.status(200).json({
        message: 'Profile updated successfully.',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'Internal server error while updating user.' });
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