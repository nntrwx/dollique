const express = require('express');
const CategoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireAdmin = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', CategoryController.getAllCategories);
router.get('/:category_id', CategoryController.getCategoryById);
router.get('/:category_id/posts', CategoryController.getCategoryPosts);

router.post('/', authMiddleware, requireAdmin, CategoryController.createCategory);
router.patch('/:category_id', authMiddleware, requireAdmin, CategoryController.updateCategory);
router.delete('/:category_id', authMiddleware, requireAdmin, CategoryController.deleteCategory);

module.exports = router;