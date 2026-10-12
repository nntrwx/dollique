const PostModel = require('../models/PostModel');
const AppealModel = require('../models/AppealModel');
const NotificationModel = require('../models/NotificationModel');
const RatingService = require('./ratingService');
const ViolationService = require('./violationService');

const GRACE_DAYS = Number(process.env.MODERATION_GRACE_DAYS) || 7;

class ModerationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class ModerationService {
  static get graceDays() {
    return GRACE_DAYS;
  }

  static async hidePost(post, reason, adminId = null) {
    const cleanReason = reason && String(reason).trim()
      ? String(reason).trim()
      : 'The post breaks the community rules.';

    const updatedPost = await PostModel.setModeration(post.id, { reason: cleanReason, graceDays: GRACE_DAYS });

    await NotificationModel.create({
      userId: post.authorId,
      postId: post.id,
      type: 'post_moderated',
      message: `Your post "${post.title}" was hidden by a moderator. Reason: ${cleanReason} `
        + `You can appeal within ${GRACE_DAYS} days; otherwise the post will be deleted automatically.`,
    });
    await ViolationService.record({
      userId: post.authorId, type: 'post_hidden', targetId: post.id, reason: cleanReason, adminId,
    });

    return updatedPost;
  }

  static async restorePost(post, adminResponse = 'A moderator restored your post.') {
    const updatedPost = await PostModel.clearModeration(post.id);
    await AppealModel.approvePendingForPost(post.id, adminResponse);
    await ViolationService.revoke('post_hidden', post.id);

    await NotificationModel.create({
      userId: post.authorId,
      postId: post.id,
      type: 'post_restored',
      message: `Your post "${post.title}" is visible again. ${adminResponse}`,
    });

    return updatedPost;
  }

  static async submitAppeal(post, user, message) {
    if (post.authorId !== user.id) {
      throw new ModerationError(403, 'Forbidden: Only the author of the post can appeal.');
    }
    if (!post.moderation) {
      throw new ModerationError(400, 'This post was not hidden by a moderator, there is nothing to appeal.');
    }
    if (!message || !String(message).trim()) {
      throw new ModerationError(400, 'Required parameter: [message].');
    }
    if (String(message).length > 2000) {
      throw new ModerationError(400, 'Appeal message cannot exceed 2000 characters.');
    }

    const previous = await AppealModel.findForCurrentModeration(post.id, post.moderation.moderatedAt);
    if (previous.some((a) => a.status === 'pending')) {
      throw new ModerationError(409, 'You already have a pending appeal for this post.');
    }
    if (previous.some((a) => a.status === 'rejected')) {
      throw new ModerationError(409, 'Your appeal for this post was already rejected.');
    }

    const appeal = await AppealModel.create({ postId: post.id, authorId: user.id, message: String(message).trim() });
    await PostModel.setDeleteAfter(post.id, null);
    return appeal;
  }

  static async resolveAppeal(appeal, { status, adminResponse }) {
    if (appeal.status !== 'pending') {
      throw new ModerationError(409, `This appeal is already ${appeal.status}.`);
    }
    if (!['approved', 'rejected'].includes(status)) {
      throw new ModerationError(400, 'Status must be either "approved" or "rejected".');
    }

    const post = await PostModel.findById(appeal.postId);
    const response = adminResponse && String(adminResponse).trim() ? String(adminResponse).trim() : null;
    const resolved = await AppealModel.resolve(appeal.id, { status, adminResponse: response });

    if (status === 'approved') {
      await PostModel.clearModeration(post.id);
      await ViolationService.revoke('post_hidden', post.id);
      await NotificationModel.create({
        userId: post.authorId,
        postId: post.id,
        type: 'post_restored',
        message: `Your appeal for "${post.title}" was approved, the post is visible again.${response ? ' ' + response : ''}`,
      });
    } else {
      await PostModel.setDeleteAfter(post.id, GRACE_DAYS);
      await NotificationModel.create({
        userId: post.authorId,
        postId: post.id,
        type: 'appeal_rejected',
        message: `Your appeal for "${post.title}" was rejected${response ? ': ' + response : '.'} `
          + `The post will be deleted automatically in ${GRACE_DAYS} days.`,
      });
    }

    return await AppealModel.findById(resolved.id);
  }

  static async deleteExpiredPosts() {
    const expired = await PostModel.findExpiredModerated();

    for (const post of expired) {
      await PostModel.delete(post.id);
      await RatingService.recalculateUserRating(post.authorId);
      await NotificationModel.create({
        userId: post.authorId,
        type: 'post_deleted',
        message: `Your post "${post.title}" was deleted because the moderation decision was not appealed in time.`,
      });
    }

    if (expired.length > 0) {
      console.log(`🧹 Moderation: deleted ${expired.length} expired post(s).`);
    }
    return expired.length;
  }

  static startScheduler() {
    const minutes = Number(process.env.MODERATION_CHECK_MINUTES) || 60;
    const run = () => this.deleteExpiredPosts().catch((err) => console.error('Moderation cleanup error:', err));

    run();
    return setInterval(run, minutes * 60 * 1000);
  }
}

ModerationService.ModerationError = ModerationError;

module.exports = ModerationService;
