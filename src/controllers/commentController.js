const CommentModel = require('../models/CommentModel');
const PostModel = require('../models/PostModel');
const LikeModel = require('../models/LikeModel');
const RatingService = require('../services/ratingService');
const ViolationService = require('../services/violationService');
const NotificationModel = require('../models/NotificationModel');

const DEFAULT_REASON = 'The comment breaks the community rules.';

function snippet(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean;
}

class CommentController {
  // A comment is visible when both the comment and its post are visible to the user
  static async isCommentVisible(comment, user) {
    if (!CommentModel.isVisibleTo(comment, user)) return false;
    const post = await PostModel.findById(comment.postId);
    return PostModel.isVisibleTo(post, user);
  }

  // GET /api/posts/:post_id/comments
  static async getPostComments(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const post = await PostModel.findById(postId);
      if (!PostModel.isVisibleTo(post, req.user)) {
        return res.status(404).json({ error: 'Post not found or is currently inactive.' });
      }

      const comments = await CommentModel.findByPostId(postId, req.user);
      return res.status(200).json(comments);
    } catch (error) {
      console.error('Get post comments error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching comments.' });
    }
  }

  // POST /api/posts/:post_id/comments
  static async createComment(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const { content, parent_id } = req.body;
      const authorId = req.user.id;

      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({ error: 'Required parameter: [content].' });
      }

      if (content.length > 5000) {
        return res.status(400).json({ error: 'Comment content cannot exceed 5000 characters.' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      if (post.status !== 'active' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Cannot comment on inactive or closed posts.' });
      }

      if (parent_id) {
        const parentComment = await CommentModel.findById(parent_id);
        if (!parentComment || parentComment.postId !== postId) {
          return res.status(400).json({ error: 'Invalid parent_id: parent comment does not belong to this post.' });
        }
      }

      const newComment = await CommentModel.create({
        authorId,
        postId,
        content: content.trim(),
        parentId: parent_id || null,
      });

      return res.status(201).json({
        message: 'Comment created successfully.',
        comment: newComment,
      });
    } catch (error) {
      console.error('Create comment error:', error);
      return res.status(500).json({ error: 'Internal server error while creating comment.' });
    }
  }

  // GET /api/comments/:comment_id
  static async getCommentById(req, res) {
    try {
      const commentId = Number(req.params.comment_id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment_id format.' });
      }

      const comment = await CommentModel.findById(commentId);
      if (!(await CommentController.isCommentVisible(comment, req.user))) {
        return res.status(404).json({ error: 'Comment not found or is currently inactive.' });
      }

      return res.status(200).json(comment);
    } catch (error) {
      console.error('Get comment by ID error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching comment.' });
    }
  }

  // PATCH /api/comments/:comment_id
  static async updateComment(req, res) {
    try {
      const commentId = Number(req.params.comment_id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment_id format.' });
      }

      const { status } = req.body;
      const requester = req.user;

      const comment = await CommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      if (!requester || (requester.role !== 'admin' && requester.id !== comment.authorId)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient rights.' });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either "active" or "inactive".' });
      }

      const updatedComment = await CommentModel.updateStatus(commentId, status);

      // An admin hiding someone else's comment gives the author a strike; showing it again cancels the strike
      if (requester.role === 'admin' && requester.id !== comment.authorId && status !== comment.status) {
        if (status === 'inactive') {
          const reason = String(req.body.reason || '').trim() || DEFAULT_REASON;
          await NotificationModel.create({
            userId: comment.authorId,
            postId: comment.postId,
            type: 'comment_moderated',
            message: `Your comment "${snippet(comment.content)}" was hidden by a moderator. Reason: ${reason}`,
          });
          await ViolationService.record({
            userId: comment.authorId, type: 'comment_hidden', targetId: commentId, reason, adminId: requester.id,
          });
        } else {
          await ViolationService.revoke('comment_hidden', commentId);
        }
      }

      return res.status(200).json({
        message: 'Comment status updated successfully.',
        comment: updatedComment,
      });
    } catch (error) {
      console.error('Update comment error:', error);
      return res.status(500).json({ error: 'Internal server error while updating comment.' });
    }
  }

  // DELETE /api/comments/:comment_id
  static async deleteComment(req, res) {
    try {
      const commentId = Number(req.params.comment_id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment_id format.' });
      }

      const requester = req.user;
      const comment = await CommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      // Admin, the comment author and the author of the post can delete a comment
      const post = await PostModel.findById(comment.postId);
      const isPostAuthor = post && requester.id === post.authorId;
      if (requester.role !== 'admin' && requester.id !== comment.authorId && !isPostAuthor) {
        return res.status(403).json({
          error: 'Forbidden: Only the comment author, the post author or an admin can delete this comment.',
        });
      }

      await CommentModel.delete(commentId);
      await RatingService.recalculateUserRating(comment.authorId);

      // Deleting by an admin replaces the "hidden" strike (if any) with a "deleted" one, so it is not counted twice
      if (requester.role === 'admin' && requester.id !== comment.authorId) {
        const reason = String((req.body && req.body.reason) || '').trim() || DEFAULT_REASON;
        await ViolationService.revoke('comment_hidden', commentId);
        await NotificationModel.create({
          userId: comment.authorId,
          postId: comment.postId,
          type: 'comment_deleted',
          message: `Your comment "${snippet(comment.content)}" was deleted by a moderator. Reason: ${reason}`,
        });
        await ViolationService.record({
          userId: comment.authorId, type: 'comment_deleted', targetId: commentId, reason, adminId: requester.id,
        });
      }

      return res.status(200).json({ message: 'Comment deleted successfully.' });
    } catch (error) {
      console.error('Delete comment error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting comment.' });
    }
  }

  // GET /api/comments/:comment_id/like
  static async getCommentLikes(req, res) {
    try {
      const commentId = Number(req.params.comment_id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment_id format.' });
      }

      const comment = await CommentModel.findById(commentId);
      if (!(await CommentController.isCommentVisible(comment, req.user))) {
        return res.status(404).json({ error: 'Comment not found or is currently inactive.' });
      }

      const likes = await LikeModel.findCommentLikes(commentId);
      return res.status(200).json(likes);
    } catch (error) {
      console.error('Get comment likes error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching comment likes.' });
    }
  }

  // POST /api/comments/:comment_id/like
  static async likeComment(req, res) {
    try {
      const commentId = Number(req.params.comment_id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment_id format.' });
      }

      const { type = 'like' } = req.body;
      const authorId = req.user.id;

      if (!['like', 'dislike'].includes(type)) {
        return res.status(400).json({ error: 'Vote type must be "like" or "dislike".' });
      }

      const comment = await CommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      // Security fix: cannot vote on inactive comments
      if (comment.status !== 'active') {
        return res.status(403).json({ error: 'Cannot vote on inactive comments.' });
      }

      const vote = await LikeModel.voteOnComment(authorId, commentId, type);
      await RatingService.recalculateUserRating(comment.authorId);

      return res.status(200).json({
        message: `Comment ${type}d successfully.`,
        vote,
      });
    } catch (error) {
      console.error('Vote comment error:', error);
      return res.status(500).json({ error: 'Internal server error while voting on comment.' });
    }
  }

  // DELETE /api/comments/:comment_id/like
  static async deleteCommentLike(req, res) {
    try {
      const commentId = Number(req.params.comment_id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment_id format.' });
      }

      const authorId = req.user.id;
      const comment = await CommentModel.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
      }

      const removed = await LikeModel.removeCommentVote(authorId, commentId);
      if (!removed) {
        return res.status(404).json({ error: 'No vote found to delete.' });
      }

      await RatingService.recalculateUserRating(comment.authorId);

      return res.status(200).json({ message: 'Comment vote removed successfully.' });
    } catch (error) {
      console.error('Delete comment like error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting comment vote.' });
    }
  }
}

module.exports = CommentController;