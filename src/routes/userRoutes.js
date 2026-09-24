const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// GET /api/users - Get all users
router.get('/', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ');
  if (token) {
    try {
      req.user = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    } catch (e) {}
  }
  next();
}, UserController.getAllUsers);

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