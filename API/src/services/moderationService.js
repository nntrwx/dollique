const PostModel = require('../models/PostModel');
const AppealModel = require('../models/AppealModel');
const NotificationModel = require('../models/NotificationModel');
const UserModel = require('../models/UserModel');
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

  static async hidePost(post, reason) {
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
    // No strike yet: the author may still appeal. The strike comes only if the post is
    // really deleted (appeal rejected or no appeal in time), so a hide can't ban someone
    // before they had a chance to explain.

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

    // every admin hears about it in their notification bell
    const adminIds = await UserModel.findAdminIds();
    await Promise.all(adminIds.map((adminId) => NotificationModel.create({
      userId: adminId,
      postId: post.id,
      type: 'appeal_submitted',
      message: `${user.login} appealed against hiding "${post.title}".`,
    })));
    return appeal;
  }

  // The latest appeal sent since the post was hidden (or null), for the post page.
  static async currentAppeal(post) {
    if (!post.moderation) return null;
    const [latest] = await AppealModel.findForCurrentModeration(post.id, post.moderation.moderatedAt);
    return latest || null;
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
      // A rejected appeal is the final decision: the post is deleted right away.
      // The appeal is deleted with it (ON DELETE CASCADE), so its last state is kept for the answer.
      const finalAppeal = await AppealModel.findById(resolved.id);
      await PostModel.delete(post.id);
      await RatingService.recalculateUserRating(post.authorId);
      await this.strikeForDeletedPost(post);
      await NotificationModel.create({
        userId: post.authorId,
        type: 'appeal_rejected',
        message: `Your appeal for "${post.title}" was rejected and the post was deleted.`
          + (response ? ` Moderator: ${response}` : ''),
      });
      return finalAppeal;
    }

    return await AppealModel.findById(resolved.id);
  }

  // The strike for a hidden post that ended up deleted.
  static async strikeForDeletedPost(post) {
    // posts hidden before this rule already got their strike when they were hidden
    if (await ViolationService.hasActive('post_hidden', post.id)) return;
    await ViolationService.record({
      userId: post.authorId, type: 'post_hidden', targetId: post.id, reason: post.moderation?.reason || null,
    });
  }

  static async deleteExpiredPosts() {
    const expired = await PostModel.findExpiredModerated();

    for (const post of expired) {
      await PostModel.delete(post.id);
      await RatingService.recalculateUserRating(post.authorId);
      await this.strikeForDeletedPost(post);
      await NotificationModel.create({
        userId: post.authorId,
        type: 'post_deleted',
        message: `Your post "${post.title}" was deleted: it was not restored after moderation.`,
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
