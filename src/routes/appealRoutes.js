const express = require('express');
const AppealController = require('../controllers/appealController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');

const router = express.Router();

// GET /api/appeals - List appeals (admin only, ?status=pending|approved|rejected)
router.get('/', authMiddleware, requireAdmin, AppealController.getAllAppeals);

// GET /api/appeals/:appeal_id - Appeal details (admin or appeal author)
router.get('/:appeal_id', authMiddleware, AppealController.getAppealById);

// PATCH /api/appeals/:appeal_id - Approve or reject (admin only)
router.patch('/:appeal_id', authMiddleware, requireAdmin, AppealController.resolveAppeal);

module.exports = router;
