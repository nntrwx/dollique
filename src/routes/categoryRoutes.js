const express = require('express');
const CategoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');
const optionalAuth = require('../middlewares/optionalAuthMiddleware');

const router = express.Router();

router.get('/', optionalAuth, CategoryController.getAllCategories);
router.get('/:category_id', optionalAuth, CategoryController.getCategoryById);
router.get('/:category_id/posts', optionalAuth, CategoryController.getCategoryPosts);

router.post('/', authMiddleware, CategoryController.createCategory);
router.patch('/:category_id', authMiddleware, requireAdmin, CategoryController.updateCategory);
router.delete('/:category_id', authMiddleware, requireAdmin, CategoryController.deleteCategory);

module.exports = router;