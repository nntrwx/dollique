const express = require('express');
const PostController = require('../controllers/postController');
const CommentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');
const { uploadPostImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// GET /api/posts - Get all posts 
router.get('/', optionalAuth, PostController.getAllPosts);

// POST /api/posts - Create post
router.post('/', authMiddleware, uploadPostImage.array('images', 5), PostController.createPost);

router.get('/favorites', authMiddleware, PostController.getFavorites);

router.get('/:post_id', optionalAuth, PostController.getPostById);
router.patch('/:post_id', authMiddleware, PostController.updatePost);
router.delete('/:post_id', authMiddleware, PostController.deletePost);

router.post('/:post_id/appeal', authMiddleware, PostController.appealPost);

router.post('/:post_id/favorite', authMiddleware, PostController.toggleFavorite);

router.get('/:post_id/categories', optionalAuth, PostController.getPostCategories);

router.get('/:post_id/like', optionalAuth, PostController.getPostLikes);
router.post('/:post_id/like', authMiddleware, PostController.likePost);
router.delete('/:post_id/like', authMiddleware, PostController.deletePostLike);

router.get('/:post_id/comments', optionalAuth, CommentController.getPostComments);
router.post('/:post_id/comments', authMiddleware, CommentController.createComment);

module.exports = router;