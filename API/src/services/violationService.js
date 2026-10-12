const UserModel = require('../models/UserModel');
const ViolationModel = require('../models/ViolationModel');
const NotificationModel = require('../models/NotificationModel');

const BAN_STRIKES = Number(process.env.BAN_STRIKES) || 3;
const BAN_DAYS = Number(process.env.BAN_DAYS) || 7;

const LABELS = {
  post_hidden: 'post hidden by a moderator',
  post_deleted: 'post deleted by a moderator',
  comment_hidden: 'comment hidden by a moderator',
  comment_deleted: 'comment deleted by a moderator',
  category_rejected: 'category rejected',
  profile_reset: 'profile reset by a moderator',
};

class ViolationService {
  static get banStrikes() {
    return BAN_STRIKES;
  }

  static get banDays() {
    return BAN_DAYS;
  }

  static async activeStrikes(userId) {
    const since = await UserModel.getStrikesResetAt(userId);
    return await ViolationModel.countActive(userId, since);
  }

  static async record({ userId, type, targetId = null, reason = null, adminId = null }) {
    const user = await UserModel.findById(userId, true);
    if (!user || user.role === 'admin') return null;

    await ViolationModel.create({ userId, type, targetId, reason, createdBy: adminId });
    const strikes = await this.activeStrikes(userId);

    if (strikes >= BAN_STRIKES && !UserModel.isBanned(user)) {
      const banReason = `Automatic ban: ${strikes} violations of the community rules (last one: ${LABELS[type]}).`;
      await this.ban(userId, BAN_DAYS, banReason);
      return { strikes, banned: true };
    }

    await NotificationModel.create({
      userId,
      type: 'violation',
      message: `You received a strike: ${LABELS[type]}. Active strikes: ${strikes} of ${BAN_STRIKES}. `
        + `At ${BAN_STRIKES} strikes your account is banned for ${BAN_DAYS} days.`,
    });
    return { strikes, banned: false };
  }

  static async revoke(type, targetId) {
    return await ViolationModel.revokeByTarget(type, targetId);
  }

  static async ban(userId, days, reason) {
    await UserModel.setBan(userId, days, reason);
    await NotificationModel.create({
      userId,
      type: 'user_banned',
      message: `Your account is banned for ${days} day(s). Reason: ${reason}`,
    });
    return await UserModel.findById(userId, true);
  }

  static async unban(userId) {
    await UserModel.clearBan(userId);
    await NotificationModel.create({
      userId,
      type: 'user_unbanned',
      message: 'A moderator lifted your ban. Welcome back, please follow the community rules.',
    });
    return await UserModel.findById(userId, true);
  }
}

ViolationService.LABELS = LABELS;

module.exports = ViolationService;
