const express = require('express');
const PostController = require('../controllers/postController');
const CommentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');
const { uploadPostImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// GET /api/posts - Get all posts (with pagination, sorting & filters)
router.get('/', optionalAuth, PostController.getAllPosts);

// POST /api/posts - Create post (auth required, supports image uploads)
router.post('/', authMiddleware, uploadPostImage.array('images', 5), PostController.createPost);

// 2. Favorites (Act: Creative) - MUST be placed before /:post_id
router.get('/favorites', authMiddleware, PostController.getFavorites);

// 3. Specific Post Details & Actions
router.get('/:post_id', optionalAuth, PostController.getPostById);
router.patch('/:post_id', authMiddleware, PostController.updatePost);
router.delete('/:post_id', authMiddleware, PostController.deletePost);

// Appeal a moderator decision (post author only)
router.post('/:post_id/appeal', authMiddleware, PostController.appealPost);

// 4. Toggle Favorite for a specific post
router.post('/:post_id/favorite', authMiddleware, PostController.toggleFavorite);

// 5. Post Categories
router.get('/:post_id/categories', optionalAuth, PostController.getPostCategories);

// 6. Post Likes
router.get('/:post_id/like', optionalAuth, PostController.getPostLikes);
router.post('/:post_id/like', authMiddleware, PostController.likePost);
router.delete('/:post_id/like', authMiddleware, PostController.deletePostLike);

// 7. Post Comments
router.get('/:post_id/comments', optionalAuth, CommentController.getPostComments);
router.post('/:post_id/comments', authMiddleware, CommentController.createComment);

module.exports = router;