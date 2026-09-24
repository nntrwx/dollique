const prisma = require('../prismaClient');

// PostModel class: handles all database operations for posts
class PostModel {
  // 1. Get all posts with sorting, filtering, pagination and role-based visibility
  static async findAll({
    page = 1,
    limit = 10,
    sort = 'likes', // 'likes' (default) or 'date'
    categories,
    dateFrom,
    dateTo,
    status,
    currentUser,
  }) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};

    // Visibility rules:
    // - Admin sees everything
    // - Authenticated user sees active posts + their own inactive posts
    // - Guest/Public sees only active posts
    if (!currentUser || currentUser.role !== 'admin') {
      if (currentUser) {
        where.OR = [
          { status: 'active' },
          { authorId: currentUser.id },
        ];
      } else {
        where.status = 'active';
      }
    }

    // Filter by specific status if requested
    if (status && ['active', 'inactive'].includes(status)) {
      if (where.OR) {
        where.AND = [
          { status },
          { OR: where.OR },
        ];
        delete where.OR;
      } else {
        where.status = status;
      }
    }

    // Filter by categories
    if (categories) {
      const categoryIdList = Array.isArray(categories)
        ? categories.map(Number)
        : String(categories).split(',').map(Number);

      where.categories = {
        some: {
          categoryId: { in: categoryIdList },
        },
      };
    }

    // Filter by date interval
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Sorting order
    let orderBy = [];
    if (sort === 'date') {
      orderBy = [{ createdAt: 'desc' }];
    } else {
      orderBy = [
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' },
      ];
    }

    // Execute queries
    const [posts, totalCount] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              login: true,
              fullName: true,
              profilePicture: true,
              rating: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          images: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const formattedPosts = posts.map((post) => ({
      ...post,
      categories: post.categories.map((c) => c.category),
    }));

    return {
      posts: formattedPosts,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  // 2. Find post by ID with full details
  static async findById(id) {
    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
      include: {
        author: {
          select: {
            id: true,
            login: true,
            fullName: true,
            profilePicture: true,
            rating: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        images: true,
        likes: {
          include: {
            author: {
              select: { id: true, login: true },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) return null;

    return {
      ...post,
      categories: post.categories.map((c) => c.category),
    };
  }

  // 3. Create a new post
  static async create({ authorId, title, content, categoryIds = [], imageUrls = [] }) {
    return await prisma.post.create({
      data: {
        authorId: Number(authorId),
        title,
        content,
        categories: {
          create: categoryIds.map((catId) => ({
            categoryId: Number(catId),
          })),
        },
        images: {
          create: imageUrls.map((url) => ({
            imageUrl: url,
          })),
        },
      },
      include: {
        author: {
          select: { id: true, login: true, fullName: true, profilePicture: true },
        },
        categories: {
          include: { category: true },
        },
        images: true,
      },
    });
  }

  // 4. Update an existing post
  static async update(id, { title, content, status, categoryIds }) {
    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (status) updateData.status = status;

    if (categoryIds && Array.isArray(categoryIds)) {
      await prisma.postCategory.deleteMany({
        where: { postId: Number(id) },
      });

      updateData.categories = {
        create: categoryIds.map((catId) => ({
          categoryId: Number(catId),
        })),
      };
    }

    return await prisma.post.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        categories: {
          include: { category: true },
        },
      },
    });
  }

  // 5. Delete a post
  static async delete(id) {
    return await prisma.post.delete({
      where: { id: Number(id) },
    });
  }

  // 6. Toggle post favorite (save / unsave)
  static async toggleFavorite(userId, postId) {
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId: Number(userId),
          postId: Number(postId),
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: {
          userId_postId: {
            userId: Number(userId),
            postId: Number(postId),
          },
        },
      });
      return { action: 'removed', isFavorite: false };
    }

    await prisma.favorite.create({
      data: {
        userId: Number(userId),
        postId: Number(postId),
      },
    });
    return { action: 'added', isFavorite: true };
  }

  // 7. Get all favorite posts for a specific user
  static async findUserFavorites(userId) {
    const favorites = await prisma.favorite.findMany({
      where: { userId: Number(userId) },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, login: true, fullName: true, profilePicture: true, rating: true },
            },
            categories: {
              include: { category: true },
            },
            images: true,
            _count: {
              select: { likes: true, comments: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => ({
      ...f.post,
      categories: f.post.categories.map((c) => c.category),
      savedAt: f.createdAt,
    }));
  }
}

module.exports = PostModel;