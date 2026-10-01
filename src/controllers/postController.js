const PostModel = require('../models/PostModel');
const LikeModel = require('../models/LikeModel');
const RatingService = require('../services/ratingService');

class PostController {
  // GET /api/posts - Get all posts (with pagination, sorting & filters)
  static async getAllPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'likes',
        categories,
        date_from,
        date_to,
        status,
      } = req.query;

      const result = await PostModel.findAll({
        page,
        limit,
        sort,
        categories,
        dateFrom: date_from,
        dateTo: date_to,
        status,
        currentUser: req.user,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('Get all posts error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching posts.' });
    }
  }

  // GET /api/posts/:post_id - Get specified post data
  static async getPostById(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format. Must be an integer.' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      // Security fix: If post is inactive, only author or admin can view it
      if (post.status === 'inactive') {
        const isAuthor = req.user && req.user.id === post.authorId;
        const isAdmin = req.user && req.user.role === 'admin';
        if (!isAuthor && !isAdmin) {
          return res.status(404).json({ error: 'Post not found or is currently inactive.' });
        }
      }

      return res.status(200).json(post);
    } catch (error) {
      console.error('Get post by ID error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching post.' });
    }
  }

  // GET /api/posts/:post_id/categories - Get all categories of a post
  static async getPostCategories(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      return res.status(200).json(post.categories);
    } catch (error) {
      console.error('Get post categories error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching post categories.' });
    }
  }

  // POST /api/posts - Create new post
  static async createPost(req, res) {
    try {
      const { title, content, categories } = req.body;
      const authorId = req.user.id;

      if (!title || !content || !categories) {
        return res.status(400).json({
          error: 'Required parameters: [title, content, categories].',
        });
      }

      if (title.length > 255) {
        return res.status(400).json({ error: 'Title cannot exceed 255 characters.' });
      }

      let categoryIds = [];
      if (Array.isArray(categories)) {
        categoryIds = categories.map(Number);
      } else {
        categoryIds = String(categories).split(',').map(Number);
      }

      let imageUrls = [];
      if (req.files && Array.isArray(req.files)) {
        imageUrls = req.files.map((file) => `/uploads/posts/${file.filename}`);
      } else if (req.body.images) {
        imageUrls = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
      }

      const newPost = await PostModel.create({
        authorId,
        title,
        content,
        categoryIds,
        imageUrls,
      });

      return res.status(201).json({
        message: 'Post created successfully.',
        post: newPost,
      });
    } catch (error) {
      console.error('Create post error:', error);
      return res.status(500).json({ error: 'Internal server error while creating post.' });
    }
  }

  // PATCH /api/posts/:post_id - Update post
  static async updatePost(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const requester = req.user;
      const { title, content, status, categories } = req.body;

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      const isAuthor = requester.id === post.authorId;
      const isAdmin = requester.role === 'admin';

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden: You can only edit your own posts.' });
      }

      const updateData = {};

      if (isAuthor) {
        if (title) {
          if (title.length > 255) return res.status(400).json({ error: 'Title cannot exceed 255 characters.' });
          updateData.title = title;
        }
        if (content) updateData.content = content;
      } else if (isAdmin && (title || content)) {
        return res.status(403).json({
          error: 'Forbidden: Admins cannot edit the original post content or title.',
        });
      }

      if (status && ['active', 'inactive'].includes(status)) {
        updateData.status = status;
      }

      if (categories) {
        updateData.categoryIds = Array.isArray(categories)
          ? categories.map(Number)
          : String(categories).split(',').map(Number);
      }

      const updatedPost = await PostModel.update(postId, updateData);

      return res.status(200).json({
        message: 'Post updated successfully.',
        post: updatedPost,
      });
    } catch (error) {
      console.error('Update post error:', error);
      return res.status(500).json({ error: 'Internal server error while updating post.' });
    }
  }

  // DELETE /api/posts/:post_id - Delete post
  static async deletePost(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const requester = req.user;
      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      if (requester.role !== 'admin' && requester.id !== post.authorId) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own posts.' });
      }

      await PostModel.delete(postId);
      await RatingService.recalculateUserRating(post.authorId);

      return res.status(200).json({ message: 'Post deleted successfully.' });
    } catch (error) {
      console.error('Delete post error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting post.' });
    }
  }

  // GET /api/posts/:post_id/like - Get all likes under post
  static async getPostLikes(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      const likes = await LikeModel.findPostLikes(postId);
      return res.status(200).json(likes);
    } catch (error) {
      console.error('Get post likes error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching likes.' });
    }
  }

  // POST /api/posts/:post_id/like - Create or update like/dislike under post
  static async likePost(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const { type = 'like' } = req.body;
      const authorId = req.user.id;

      if (!['like', 'dislike'].includes(type)) {
        return res.status(400).json({ error: 'Vote type must be "like" or "dislike".' });
      }

      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      // Security fix: cannot vote on inactive/locked posts
      if (post.status !== 'active') {
        return res.status(403).json({ error: 'Cannot vote on inactive or locked posts.' });
      }

      const vote = await LikeModel.voteOnPost(authorId, postId, type);
      await RatingService.recalculateUserRating(post.authorId);

      return res.status(200).json({
        message: `Post ${type}d successfully.`,
        vote,
      });
    } catch (error) {
      console.error('Vote post error:', error);
      return res.status(500).json({ error: 'Internal server error while voting on post.' });
    }
  }

  // DELETE /api/posts/:post_id/like - Remove like/dislike under post
  static async deletePostLike(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const authorId = req.user.id;
      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      const removed = await LikeModel.removePostVote(authorId, postId);
      if (!removed) {
        return res.status(404).json({ error: 'No vote found to delete.' });
      }

      await RatingService.recalculateUserRating(post.authorId);

      return res.status(200).json({ message: 'Vote removed successfully.' });
    } catch (error) {
      console.error('Delete post like error:', error);
      return res.status(500).json({ error: 'Internal server error while deleting vote.' });
    }
  }

  // POST /api/posts/:post_id/favorite - Add or remove post from favorites
  static async toggleFavorite(req, res) {
    try {
      const postId = Number(req.params.post_id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post_id format.' });
      }

      const userId = req.user.id;
      const post = await PostModel.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      const result = await PostModel.toggleFavorite(userId, postId);

      return res.status(200).json({
        message: result.isFavorite ? 'Post added to favorites.' : 'Post removed from favorites.',
        isFavorite: result.isFavorite,
      });
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return res.status(500).json({ error: 'Internal server error while toggling favorite.' });
    }
  }

  // GET /api/posts/favorites - Get all favorite posts
  static async getFavorites(req, res) {
    try {
      const userId = req.user.id;
      const favoritePosts = await PostModel.findUserFavorites(userId);

      return res.status(200).json(favoritePosts);
    } catch (error) {
      console.error('Get favorites error:', error);
      return res.status(500).json({ error: 'Internal server error while fetching favorites.' });
    }
  }
}

module.exports = PostController;