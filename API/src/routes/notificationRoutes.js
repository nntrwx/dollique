const express = require('express');
const NotificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// GET /api/notifications - Own notifications
router.get('/', NotificationController.getMyNotifications);

// PATCH /api/notifications/read-all - Mark all as read 
router.patch('/read-all', NotificationController.markAllAsRead);

// PATCH /api/notifications/:notification_id/read - Mark one as read
router.patch('/:notification_id/read', NotificationController.markAsRead);

// DELETE /api/notifications/:notification_id - Delete own notification
router.delete('/:notification_id', NotificationController.deleteNotification);

module.exports = router;
