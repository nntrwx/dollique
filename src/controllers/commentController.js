const CommentModel = require('../models/CommentModel');
const PostModel = require('../models/PostModel');
const LikeModel = require('../models/LikeModel');
const RatingService = require('../services/ratingService');

class CommentController {
  // GET /api/posts/:post_id/comments
  static async getPostComments(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
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

      if (!content || !content.trim()) {
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
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
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

      if (requester.role !== 'admin' && requester.id !== comment.authorId) {
        return res.status(403).json({ error: 'Forbidden: You can only update your own comments.' });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either "active" or "inactive".' });
      }

      const updatedComment = await CommentModel.updateStatus(commentId, status);

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

      if (requester.role !== 'admin' && requester.id !== comment.authorId) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own comments.' });
      }

      await CommentModel.delete(commentId);
      await RatingService.recalculateUserRating(comment.authorId);

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
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
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