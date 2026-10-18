const NotificationModel = require('../models/NotificationModel');
const pool = require('../../database/db');

// Notifications about other people's activity: comments, replies and likes.
// Nobody is notified about their own actions, and the same unread notification
// is not added twice (for example when someone removes a like and likes again).
const EXCERPT_LENGTH = 80;

function excerpt(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > EXCERPT_LENGTH ? `${clean.slice(0, EXCERPT_LENGTH - 1)}…` : clean;
}

class ActivityService {
  static async notify({ userId, actorId, postId, type, message }) {
    if (!userId || Number(userId) === Number(actorId)) return;

    const [rows] = await pool.execute(
      'SELECT id FROM notifications WHERE user_id = ? AND type = ? AND post_id <=> ? AND message = ? AND is_read = 0 LIMIT 1',
      [Number(userId), type, postId ? Number(postId) : null, message],
    );
    if (rows.length) return;

    await NotificationModel.create({ userId, postId, type, message });
  }

  // A new comment: the author of the parent comment gets "replied", the post author gets "commented".
  static async commentCreated({ actor, post, comment, parentComment = null }) {
    const text = excerpt(comment.content);

    if (parentComment) {
      await this.notify({
        userId: parentComment.authorId,
        actorId: actor.id,
        postId: post.id,
        type: 'comment_reply',
        message: `${actor.login} replied to your comment on "${post.title}": "${text}"`,
      });
    }

    // The post author already got a reply notification if it was their comment.
    if (!parentComment || parentComment.authorId !== post.authorId) {
      await this.notify({
        userId: post.authorId,
        actorId: actor.id,
        postId: post.id,
        type: 'post_comment',
        message: `${actor.login} commented on your post "${post.title}": "${text}"`,
      });
    }
  }

  // Only likes are announced; dislikes stay quiet.
  static async postLiked({ actor, post }) {
    await this.notify({
      userId: post.authorId,
      actorId: actor.id,
      postId: post.id,
      type: 'post_like',
      message: `${actor.login} liked your post "${post.title}"`,
    });
  }

  static async commentLiked({ actor, comment, post }) {
    await this.notify({
      userId: comment.authorId,
      actorId: actor.id,
      postId: comment.postId,
      type: 'comment_like',
      message: `${actor.login} liked your comment on "${post ? post.title : 'a post'}": "${excerpt(comment.content)}"`,
    });
  }
}

module.exports = ActivityService;
