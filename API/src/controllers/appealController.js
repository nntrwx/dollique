const AppealModel = require('../models/AppealModel');
const ModerationService = require('../services/moderationService');

class AppealController {
  static async getAllAppeals(req, res) {
    try {
      const { status } = req.query;
      if (status && !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status filter must be "pending", "approved" or "rejected".' });
      }

      const appeals = await AppealModel.findAll({ status });
      return res.status(200).json(appeals);
    } catch (error) {
      console.error('Get appeals error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching appeals.' });
    }
  }

  // GET /api/appeals/:appeal_id - Admin or the appeal author
  static async getAppealById(req, res) {
    try {
      const appealId = Number(req.params.appeal_id);
      if (isNaN(appealId)) {
        return res.status(400).json({ error: 'Invalid appeal_id format.' });
      }

      const appeal = await AppealModel.findById(appealId);
      if (!appeal) {
        return res.status(404).json({ error: 'Appeal not found.' });
      }

      if (req.user.role !== 'admin' && req.user.id !== appeal.authorId) {
        return res.status(403).json({ error: 'Forbidden: You can only view your own appeals.' });
      }

      return res.status(200).json(appeal);
    } catch (error) {
      console.error('Get appeal error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching appeal.' });
    }
  }

  // PATCH /api/appeals/:appeal_id - Admin: approve or reject
  static async resolveAppeal(req, res) {
    try {
      const appealId = Number(req.params.appeal_id);
      if (isNaN(appealId)) {
        return res.status(400).json({ error: 'Invalid appeal_id format.' });
      }

      const appeal = await AppealModel.findById(appealId);
      if (!appeal) {
        return res.status(404).json({ error: 'Appeal not found.' });
      }

      const { status, admin_response } = req.body;
      const resolved = await ModerationService.resolveAppeal(appeal, { status, adminResponse: admin_response });

      return res.status(200).json({
        message: status === 'approved'
          ? 'Appeal approved, the post is active again.'
          : `Appeal rejected, the post will be deleted in ${ModerationService.graceDays} days.`,
        appeal: resolved,
      });
    } catch (error) {
      if (error instanceof ModerationService.ModerationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Resolve appeal error:', error);
      return res.status(500).json({ error: 'Internal server error while resolving appeal.' });
    }
  }
}

module.exports = AppealController;
