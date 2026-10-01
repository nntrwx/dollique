const pool = require('../../database/db');

class PostModel {
  // 1. Get all posts with sorting, filtering, pagination and strict access control
  static async findAll({
    page = 1,
    limit = 10,
    sort = 'likes',
    categories,
    dateFrom,
    dateTo,
    status,
    currentUser = null,
  }) {
    // Sanitize pagination: limit between 1 and 100, page >= 1
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    // Security fix: Strict visibility rule
    if (!currentUser || currentUser.role !== 'admin') {
      if (currentUser) {
        // Authenticated user sees all active posts OR their own inactive posts
        if (status === 'inactive') {
          conditions.push("p.status = 'inactive' AND p.author_id = ?");
          params.push(currentUser.id);
        } else if (status === 'active') {
          conditions.push("p.status = 'active'");
        } else {
          conditions.push("(p.status = 'active' OR p.author_id = ?)");
          params.push(currentUser.id);
        }
      } else {
        // Guest can NEVER see inactive posts
        conditions.push("p.status = 'active'");
      }
    } else {
      // Admin can filter by any status if requested
      if (status && ['active', 'inactive'].includes(status)) {
        conditions.push("p.status = ?");
        params.push(status);
      }
    }

    // Filter by categories (supports array or comma-separated string)
    if (categories) {
      const catIds = (Array.isArray(categories) ? categories : String(categories).split(','))
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      if (catIds.length > 0) {
        const placeholders = catIds.map(() => '?').join(',');
        conditions.push(`p.id IN (SELECT post_id FROM post_categories WHERE category_id IN (${placeholders}))`);
        params.push(...catIds);
      }
    }

    // Filter by date interval
    if (dateFrom && !isNaN(Date.parse(dateFrom))) {
      conditions.push("p.created_at >= ?");
      params.push(new Date(dateFrom));
    }
    if (dateTo && !isNaN(Date.parse(dateTo))) {
      conditions.push("p.created_at <= ?");
      params.push(new Date(dateTo));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fix: Sort by net score (likes minus dislikes), not just raw vote count
    let orderClause = "ORDER BY net_likes DESC, p.created_at DESC";
    if (sort === 'date') {
      orderClause = "ORDER BY p.created_at DESC";
    }

    // Count total matching posts
    const countQuery = `SELECT COUNT(*) AS total FROM posts p ${whereClause}`;
    const [countRows] = await pool.execute(countQuery, params);
    const totalCount = countRows[0] ? countRows[0].total : 0;

    // Fetch posts with aggregated votes and comments
    const postsQuery = `
      SELECT 
        p.id, p.author_id, p.title, p.content, p.status, p.created_at, p.updated_at,
        u.id AS author_user_id, u.login AS author_login, u.full_name AS author_name,
        u.profile_picture AS author_avatar, u.rating AS author_rating,
        COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 WHEN l.type = 'dislike' THEN -1 ELSE 0 END), 0) AS net_likes,
        COUNT(DISTINCT c.id) AS comments_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      ${whereClause}
      GROUP BY p.id, u.id
      ${orderClause}
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const [rows] = await pool.execute(postsQuery, params);

    // Fetch categories and images for the retrieved posts
    const postIds = rows.map((r) => r.id);
    let categoriesMap = {};
    let imagesMap = {};

    if (postIds.length > 0) {
      const idPlaceholders = postIds.map(() => '?').join(',');

      const [catRows] = await pool.execute(`
        SELECT pc.post_id, c.id, c.title, c.description
        FROM post_categories pc
        JOIN categories c ON pc.category_id = c.id
        WHERE pc.post_id IN (${idPlaceholders})
      `, postIds);

      catRows.forEach((cr) => {
        if (!categoriesMap[cr.post_id]) categoriesMap[cr.post_id] = [];
        categoriesMap[cr.post_id].push({ id: cr.id, title: cr.title, description: cr.description });
      });

      const [imgRows] = await pool.execute(`
        SELECT id, post_id, image_url
        FROM post_images
        WHERE post_id IN (${idPlaceholders})
      `, postIds);

      imgRows.forEach((ir) => {
        if (!imagesMap[ir.post_id]) imagesMap[ir.post_id] = [];
        imagesMap[ir.post_id].push(ir.image_url);
      });
    }

    const posts = rows.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      title: r.title,
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      netLikes: Number(r.net_likes) || 0,
      commentsCount: Number(r.comments_count) || 0,
      author: {
        id: r.author_user_id,
        login: r.author_login,
        fullName: r.author_name,
        profilePicture: r.author_avatar,
        rating: r.author_rating,
      },
      categories: categoriesMap[r.id] || [],
      images: imagesMap[r.id] || [],
    }));

    return {
      posts,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
    };
  }

  // 2. Find post by ID
  static async findById(id) {
    const postId = Number(id);
    if (isNaN(postId)) return null;

    const query = `
      SELECT 
        p.id, p.author_id, p.title, p.content, p.status, p.created_at, p.updated_at,
        u.id AS author_user_id, u.login AS author_login, u.full_name AS author_name,
        u.profile_picture AS author_avatar, u.rating AS author_rating,
        COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 WHEN l.type = 'dislike' THEN -1 ELSE 0 END), 0) AS net_likes,
        COUNT(DISTINCT c.id) AS comments_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.id = ?
      GROUP BY p.id, u.id
    `;

    const [rows] = await pool.execute(query, [postId]);
    if (!rows[0]) return null;

    const r = rows[0];

    // Get categories
    const [cats] = await pool.execute(`
      SELECT c.id, c.title, c.description
      FROM post_categories pc
      JOIN categories c ON pc.category_id = c.id
      WHERE pc.post_id = ?
    `, [postId]);

    // Get images
    const [imgs] = await pool.execute(`
      SELECT id, image_url
      FROM post_images
      WHERE post_id = ?
    `, [postId]);

    // Get likes detail
    const [likes] = await pool.execute(`
      SELECT l.id, l.author_id, l.type, l.created_at, u.login AS author_login
      FROM likes l
      JOIN users u ON l.author_id = u.id
      WHERE l.post_id = ?
    `, [postId]);

    return {
      id: r.id,
      authorId: r.author_id,
      title: r.title,
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      netLikes: Number(r.net_likes) || 0,
      commentsCount: Number(r.comments_count) || 0,
      author: {
        id: r.author_user_id,
        login: r.author_login,
        fullName: r.author_name,
        profilePicture: r.author_avatar,
        rating: r.author_rating,
      },
      categories: cats,
      images: imgs.map((i) => i.image_url),
      likes: likes.map((l) => ({ id: l.id, authorId: l.author_id, type: l.type, login: l.author_login })),
    };
  }

  // 3. Create post with transaction for categories and images
  static async create({ authorId, title, content, categoryIds = [], imageUrls = [] }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [postResult] = await conn.execute(`
        INSERT INTO posts (author_id, title, content, status)
        VALUES (?, ?, ?, 'active')
      `, [Number(authorId), title, content]);

      const newPostId = postResult.insertId;

      // Link categories
      for (const catId of categoryIds) {
        const id = Number(catId);
        if (!isNaN(id)) {
          await conn.execute(`
            INSERT IGNORE INTO post_categories (post_id, category_id)
            VALUES (?, ?)
          `, [newPostId, id]);
        }
      }

      // Link images
      for (const imgUrl of imageUrls) {
        await conn.execute(`
          INSERT INTO post_images (post_id, image_url)
          VALUES (?, ?)
        `, [newPostId, imgUrl]);
      }

      await conn.commit();
      return await this.findById(newPostId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // 4. Update post with transaction
  static async update(id, { title, content, status, categoryIds }) {
    const postId = Number(id);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const fields = [];
      const values = [];

      if (title) {
        fields.push("title = ?");
        values.push(title);
      }
      if (content) {
        fields.push("content = ?");
        values.push(content);
      }
      if (status && ['active', 'inactive'].includes(status)) {
        fields.push("status = ?");
        values.push(status);
      }

      if (fields.length > 0) {
        values.push(postId);
        await conn.execute(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      if (categoryIds && Array.isArray(categoryIds)) {
        await conn.execute("DELETE FROM post_categories WHERE post_id = ?", [postId]);
        for (const catId of categoryIds) {
          const cId = Number(catId);
          if (!isNaN(cId)) {
            await conn.execute("INSERT IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)", [postId, cId]);
          }
        }
      }

      await conn.commit();
      return await this.findById(postId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // 5. Delete post
  static async delete(id) {
    const postId = Number(id);
    const [result] = await pool.execute("DELETE FROM posts WHERE id = ?", [postId]);
    return result.affectedRows > 0;
  }

  // 6. Favorites (Act: Creative) - Toggle save
  static async toggleFavorite(userId, postId) {
    const uId = Number(userId);
    const pId = Number(postId);

    const [existing] = await pool.execute(`
      SELECT * FROM favorites WHERE user_id = ? AND post_id = ?
    `, [uId, pId]);

    if (existing[0]) {
      await pool.execute("DELETE FROM favorites WHERE user_id = ? AND post_id = ?", [uId, pId]);
      return { action: 'removed', isFavorite: false };
    }

    await pool.execute("INSERT INTO favorites (user_id, post_id) VALUES (?, ?)", [uId, pId]);
    return { action: 'added', isFavorite: true };
  }

  // 7. Get user's favorites
  static async findUserFavorites(userId) {
    const uId = Number(userId);
    if (isNaN(uId)) return [];

    const [rows] = await pool.execute(`
      SELECT post_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC
    `, [uId]);

    const results = [];
    for (const r of rows) {
      const post = await this.findById(r.post_id);
      if (post) results.push(post);
    }
    return results;
  }
}

module.exports = PostModel;