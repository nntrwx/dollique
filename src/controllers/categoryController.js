const CategoryModel = require('../models/CategoryModel');

class CategoryController {
  // GET /api/categories - Get all categories
  static async getAllCategories(req, res) {
    try {
      const categories = await CategoryModel.findAll();
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

      if (!category) {
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
      if (!category) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      const posts = await CategoryModel.findPostsByCategoryId(category_id);
      return res.status(200).json(posts);
    } catch (error) {
      console.error('Get category posts error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching category posts.' });
    }
  }

  // POST /api/categories - Create category (Admin only)
  static async createCategory(req, res) {
    try {
      const { title, description } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Required parameter: [title].' });
      }

      const existingCategory = await CategoryModel.findByTitle(title);
      if (existingCategory) {
        return res.status(409).json({ error: 'Category with this title already exists.' });
      }

      const newCategory = await CategoryModel.create({
        title,
        description: description || '',
      });

      return res.status(201).json({
        message: 'Category created successfully.',
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
      const { title, description } = req.body;

      const category = await CategoryModel.findById(category_id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found.' });
      }

      if (title && title !== category.title) {
        const existingCategory = await CategoryModel.findByTitle(title);
        if (existingCategory) {
          return res.status(409).json({ error: 'Category with this title already exists.' });
        }
      }

      const updatedCategory = await CategoryModel.update(category_id, {
        title,
        description,
      });

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