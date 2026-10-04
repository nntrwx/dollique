const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// GET /api/users - Get all users (optional auth to identify admin)
router.get('/', optionalAuth, UserController.getAllUsers);

// PATCH /api/users/avatar - Upload avatar (MUST be placed before /:user_id)
router.patch('/avatar', authMiddleware, uploadAvatar.single('avatar'), UserController.uploadAvatar);

// GET /api/users/:user_id - Get specific user data
router.get('/:user_id', UserController.getUserById);

// POST /api/users - Create user (Admin only)
router.post('/', authMiddleware, requireAdmin, UserController.createUser);

// PATCH /api/users/:user_id - Update user data (Owner or Admin)
router.patch('/:user_id', authMiddleware, UserController.updateUser);

// POST /api/users/:user_id/profile-reset - Reset inappropriate picture/name/bio (admin only)
router.post('/:user_id/profile-reset', authMiddleware, requireAdmin, UserController.resetProfile);

// GET /api/users/:user_id/violations - Strike history (admin or the user)
router.get('/:user_id/violations', authMiddleware, UserController.getViolations);

// POST /api/users/:user_id/ban - Ban a user for N days; DELETE lifts the ban early (admin only)
router.post('/:user_id/ban', authMiddleware, requireAdmin, UserController.banUser);
router.delete('/:user_id/ban', authMiddleware, requireAdmin, UserController.unbanUser);

// DELETE /api/users/:user_id - Delete user (Owner or Admin)
router.delete('/:user_id', authMiddleware, UserController.deleteUser);

module.exports = router;