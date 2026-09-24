const express = require('express');
const CommentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// GET /api/comments/:comment_id - Get comment data
router.get('/:comment_id', CommentController.getCommentById);

// PATCH /api/comments/:comment_id - Update comment status (active/inactive)
router.patch('/:comment_id', authMiddleware, CommentController.updateComment);

// DELETE /api/comments/:comment_id - Delete comment
router.delete('/:comment_id', authMiddleware, CommentController.deleteComment);

// GET /api/comments/:comment_id/like - Get all likes for a comment
router.get('/:comment_id/like', CommentController.getCommentLikes);

// POST /api/comments/:comment_id/like - Like or dislike a comment
router.post('/:comment_id/like', authMiddleware, CommentController.likeComment);

// DELETE /api/comments/:comment_id/like - Remove vote from a comment
router.delete('/:comment_id/like', authMiddleware, CommentController.deleteCommentLike);

module.exports = router;