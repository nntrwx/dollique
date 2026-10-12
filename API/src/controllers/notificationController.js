const NotificationModel = require('../models/NotificationModel');

class NotificationController {
  // GET /api/notifications?unread=true
  static async getMyNotifications(req, res) {
    try {
      const unreadOnly = req.query.unread === 'true';
      const notifications = await NotificationModel.findByUser(req.user.id, { unreadOnly });
      return res.status(200).json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching notifications.' });
    }
  }

  // PATCH /api/notifications/read-all
  static async markAllAsRead(req, res) {
    try {
      const updated = await NotificationModel.markAllAsRead(req.user.id);
      return res.status(200).json({ message: 'All notifications marked as read.', updated });
    } catch (error) {
      console.error('Mark all notifications error:', error);
      return res.status(500).json({ error: 'Internal server error while updating notifications.' });
    }
  }

  // PATCH /api/notifications/:notification_id/read
  static async markAsRead(req, res) {
    try {
      const notification = await NotificationController.findOwned(req, res);
      if (!notification) return;

      const updated = await NotificationModel.markAsRead(notification.id);
      return res.status(200).json({ message: 'Notification marked as read.', notification: updated });
    } catch (error) {
      console.error('Mark notification error:', error);
      return res.status(500).json({ error: 'Internal server error while updating notification.' });
    }
  }

  // DELETE /api/notifications/:notification_id
  static async deleteNotification(req, res) {
    try {
      const notification = await NotificationController.findOwned(req, res);
      if (!notification) return;

      await NotificationModel.delete(notification.id);
      return res.status(200).json({ message: 'Notification deleted.' });
    } catch (error) {
      console.error('Delete notification error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting notification.' });
    }
  }

  static async findOwned(req, res) {
    const notificationId = Number(req.params.notification_id);
    if (isNaN(notificationId)) {
      res.status(400).json({ error: 'Invalid notification_id format.' });
      return null;
    }

    const notification = await NotificationModel.findById(notificationId);
    if (!notification || notification.userId !== req.user.id) {
      res.status(404).json({ error: 'Notification not found.' });
      return null;
    }
    return notification;
  }
}

module.exports = NotificationController;
