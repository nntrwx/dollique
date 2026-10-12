const express = require('express');
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// GET /api/users
router.get('/', optionalAuth, UserController.getAllUsers);

// PATCH /api/users/avatar
router.patch('/avatar', authMiddleware, uploadAvatar.single('avatar'), UserController.uploadAvatar);

// GET /api/users/:user_id
router.get('/:user_id', UserController.getUserById);

// GET /api/users/:user_id/doll
router.get('/:user_id/doll', UserController.getUserDoll);

// POST /api/users
router.post('/', authMiddleware, requireAdmin, UserController.createUser);

// PATCH /api/users/:user_id
router.patch('/:user_id', authMiddleware, UserController.updateUser);

// POST /api/users/:user_id/profile-reset 
router.post('/:user_id/profile-reset', authMiddleware, requireAdmin, UserController.resetProfile);

// GET /api/users/:user_id/violations
router.get('/:user_id/violations', authMiddleware, UserController.getViolations);

// POST /api/users/:user_id/ban
router.post('/:user_id/ban', authMiddleware, requireAdmin, UserController.banUser);
router.delete('/:user_id/ban', authMiddleware, requireAdmin, UserController.unbanUser);

// DELETE /api/users/:user_id
router.delete('/:user_id', authMiddleware, UserController.deleteUser);

module.exports = router;