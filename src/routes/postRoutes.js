const express = require('express');
const jwt = require('jsonwebtoken');
const PostController = require('../controllers/postController');
const CommentController = require('../controllers/commentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { uploadPostImage } = require('../middlewares/uploadMiddleware');

const router = express.Router();

function optionalPostAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token) {
      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
      }
    }
  }
  next();
}

// GET /api/posts - Get all posts (with pagination, sorting & filters)
router.get('/', optionalPostAuth, PostController.getAllPosts);

// POST /api/posts - Create post (auth required, supports image uploads)
router.post('/', authMiddleware, uploadPostImage.array('images', 5), PostController.createPost);

// 2. Favorites (Act: Creative) - MUST be placed before /:post_id
router.get('/favorites', authMiddleware, PostController.getFavorites);

// 3. Specific Post Details & Actions
router.get('/:post_id', optionalPostAuth, PostController.getPostById);
router.patch('/:post_id', authMiddleware, PostController.updatePost);
router.delete('/:post_id', authMiddleware, PostController.deletePost);

// 4. Toggle Favorite for a specific post
router.post('/:post_id/favorite', authMiddleware, PostController.toggleFavorite);

// 5. Post Categories
router.get('/:post_id/categories', PostController.getPostCategories);

// 6. Post Likes
router.get('/:post_id/like', PostController.getPostLikes);
router.post('/:post_id/like', authMiddleware, PostController.likePost);
router.delete('/:post_id/like', authMiddleware, PostController.deletePostLike);

// 7. Post Comments
router.get('/:post_id/comments', CommentController.getPostComments);
router.post('/:post_id/comments', authMiddleware, CommentController.createComment);

module.exports = router;