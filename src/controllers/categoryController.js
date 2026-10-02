const CategoryModel = require('../models/CategoryModel');
const NotificationModel = require('../models/NotificationModel');
const ViolationService = require('../services/violationService');

class CategoryController {
  // GET /api/categories - Get all categories
  static async getAllCategories(req, res) {
    try {
      const { status } = req.query;
      if (status && !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status filter must be "pending", "approved" or "rejected".' });
      }

      const categories = await CategoryModel.findAll({ user: req.user, status });
      return res.status(200).json(categories);
    } catch (error) {
      console.error('Get all categories error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching categories.' });
    }
  }

  // GET /api/categories/:category_id - Get specified category
  static async getCategoryById(req, res) {
    try {
      const { category_id } = req.params;
      const category = await CategoryModel.findById(category_id);

      if (!CategoryModel.isVisibleTo(category, req.user)) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      return res.status(200).json(category);
    } catch (error) {
      console.error('Get category by ID error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching category.' });
    }
  }

  // GET /api/categories/:category_id/posts - Get all posts associated with category
  static async getCategoryPosts(req, res) {
    try {
      const { category_id } = req.params;

      const category = await CategoryModel.findById(category_id);
      if (!CategoryModel.isVisibleTo(category, req.user)) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      const posts = await CategoryModel.findPostsByCategoryId(category_id, req.user);
      return res.status(200).json(posts);
    } catch (error) {
      console.error('Get category posts error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching category posts.' });
    }
  }

  // POST /api/categories - Admin creates a category, a user suggests one for moderation
  static async createCategory(req, res) {
    try {
      const title = req.body.title ? String(req.body.title).trim() : '';
      const { description } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Required parameter: [title].' });
      }
      if (title.length > 100) {
        return res.status(400).json({ error: 'Title cannot exceed 100 characters.' });
      }

      const existingCategory = await CategoryModel.findByTitle(title);
      if (existingCategory) {
        const note = existingCategory.status === 'pending' ? ' It is waiting for moderation.' : '';
        return res.status(409).json({ error: `Category with this title already exists.${note}` });
      }

      const isAdmin = req.user.role === 'admin';
      const newCategory = await CategoryModel.create({
        title,
        description: description || '',
        status: isAdmin ? 'approved' : 'pending',
        createdBy: req.user.id,
      });

      return res.status(201).json({
        message: isAdmin
          ? 'Category created successfully.'
          : 'Category suggested. It will become available after a moderator approves it.',
        category: newCategory,
      });
    } catch (error) {
      console.error('Create category error:', error);
      return res.status(500).json({ error: 'Internal server error while creating category.' });
    }
  }

  // PATCH /api/categories/:category_id - Update category (Admin only)
  static async updateCategory(req, res) {
    try {
      const { category_id } = req.params;
      const { title, description, status, reason } = req.body;

      const category = await CategoryModel.findById(category_id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      if (status !== undefined) {
        if (!['approved', 'rejected'].includes(status)) {
          return res.status(400).json({ error: 'Status must be either "approved" or "rejected".' });
        }
        if (status === 'rejected' && !(reason && String(reason).trim())) {
          return res.status(400).json({ error: 'Required parameter for rejection: [reason].' });
        }
      }

      if (title && title !== category.title) {
        const existingCategory = await CategoryModel.findByTitle(title);
        if (existingCategory) {
          return res.status(409).json({ error: 'Category with this title already exists.' });
        }
      }

      let updatedCategory = await CategoryModel.update(category_id, {
        title,
        description,
      });

      if (status && status !== category.status) {
        const cleanReason = status === 'rejected' ? String(reason).trim() : null;
        updatedCategory = await CategoryModel.setStatus(category_id, status, cleanReason);

        if (category.created_by && category.created_by !== req.user.id) {
          await NotificationModel.create({
            userId: category.created_by,
            type: status === 'approved' ? 'category_approved' : 'category_rejected',
            message: status === 'approved'
              ? `Your category "${updatedCategory.title}" was approved and can now be used in posts.`
              : `Your category "${updatedCategory.title}" was rejected. Reason: ${cleanReason}`,
          });

          // A category that breaks the rules is a strike; approving it later cancels the strike
          if (status === 'rejected') {
            await ViolationService.record({
              userId: category.created_by, type: 'category_rejected', targetId: category.id,
              reason: cleanReason, adminId: req.user.id,
            });
          } else {
            await ViolationService.revoke('category_rejected', category.id);
          }
        }
      }

      return res.status(200).json({
        message: 'Category updated successfully.',
        category: updatedCategory,
      });
    } catch (error) {
      console.error('Update category error:', error);
      return res.status(500).json({ error: 'Internal server error while updating category.' });
    }
  }

  // DELETE /api/categories/:category_id - Delete category (Admin only)
  static async deleteCategory(req, res) {
    try {
      const { category_id } = req.params;

      const category = await CategoryModel.findById(category_id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      await CategoryModel.delete(category_id);

      return res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (error) {
      console.error('Delete category error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting category.' });
    }
  }
}

module.exports = CategoryController;