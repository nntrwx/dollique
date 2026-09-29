const express = require('express');
const jwt = require('jsonwebtoken');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

function optionalUserAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token) {
      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
      }
    }
  }
  next();
}

// GET /api/users - Get all users (optional auth to identify admin)
router.get('/', optionalUserAuth, UserController.getAllUsers);

// PATCH /api/users/avatar - Upload avatar (MUST be placed before /:user_id)
router.patch('/avatar', authMiddleware, uploadAvatar.single('avatar'), UserController.uploadAvatar);

// GET /api/users/:user_id - Get specific user data
router.get('/:user_id', UserController.getUserById);

// POST /api/users - Create user (Admin only)
router.post('/', authMiddleware, requireAdmin, UserController.createUser);

// PATCH /api/users/:user_id - Update user data (Owner or Admin)
router.patch('/:user_id', authMiddleware, UserController.updateUser);

// DELETE /api/users/:user_id - Delete user (Owner or Admin)
router.delete('/:user_id', authMiddleware, UserController.deleteUser);

module.exports = router;