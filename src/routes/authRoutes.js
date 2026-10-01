const express = require('express');
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public authentication endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', authMiddleware, AuthController.logout);

// Email verification endpoints (supports both browser click and API call)
router.get('/confirm-email/:confirm_token', AuthController.confirmEmail);
router.post('/confirm-email/:confirm_token', AuthController.confirmEmail);

// Password reset endpoints (GET renders web form on click, POST updates password)
router.post('/password-reset', AuthController.requestPasswordReset);
router.get('/password-reset/:confirm_token', AuthController.renderPasswordResetPage);
router.post('/password-reset/:confirm_token', AuthController.confirmPasswordReset);

module.exports = router;