const pool = require('../../database/db');

class CategoryModel {
  // 1. Get all categories
  static async findAll() {
    const [rows] = await pool.execute(`
      SELECT id, title, description, created_at
      FROM categories
      ORDER BY id ASC
    `);
    return rows;
  }

  // 2. Find category by ID
  static async findById(id) {
    const categoryId = Number(id);
    if (isNaN(categoryId)) return null;

    const [rows] = await pool.execute(`
      SELECT id, title, description, created_at
      FROM categories
      WHERE id = ?
    `, [categoryId]);

    return rows[0] || null;
  }

  // 3. Find category by title (to verify uniqueness)
  static async findByTitle(title) {
    if (!title) return null;
    const [rows] = await pool.execute(`
      SELECT id, title, description, created_at
      FROM categories
      WHERE title = ?
    `, [title]);

    return rows[0] || null;
  }

  // 4. Get posts for category (Security fix: hide inactive posts from guests)
  static async findPostsByCategoryId(categoryId, currentUser = null) {
    const catId = Number(categoryId);
    if (isNaN(catId)) return [];

    let statusCondition = "p.status = 'active'";
    const queryParams = [catId];

    if (currentUser && currentUser.role === 'admin') {
      statusCondition = "1=1"; // Admin sees all
    } else if (currentUser) {
      statusCondition = "(p.status = 'active' OR p.author_id = ?)";
      queryParams.push(currentUser.id);
    }

    const query = `
      SELECT 
        p.id, p.author_id, p.title, p.content, p.status, p.created_at, p.updated_at,
        u.id AS author_user_id, u.login AS author_login, u.full_name AS author_name,
        u.profile_picture AS author_avatar, u.rating AS author_rating,
        COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 WHEN l.type = 'dislike' THEN -1 ELSE 0 END), 0) AS net_likes,
        COUNT(DISTINCT c.id) AS comments_count
      FROM posts p
      JOIN post_categories pc ON p.id = pc.post_id
      JOIN users u ON p.author_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE pc.category_id = ? AND ${statusCondition}
      GROUP BY p.id, u.id
      ORDER BY p.created_at DESC
    `;

    const [rows] = await pool.execute(query, queryParams);

    return rows.map((r) => ({
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
    }));
  }

  // 5. Create category (Admin only)
  static async create({ title, description }) {
    const [result] = await pool.execute(`
      INSERT INTO categories (title, description)
      VALUES (?, ?)
    `, [title, description || '']);

    return {
      id: result.insertId,
      title,
      description: description || '',
    };
  }

  // 6. Update category (Admin only)
  static async update(id, { title, description }) {
    const categoryId = Number(id);
    const existing = await this.findById(categoryId);
    if (!existing) return null;

    const newTitle = title !== undefined ? title : existing.title;
    const newDesc = description !== undefined ? description : existing.description;

    await pool.execute(`
      UPDATE categories
      SET title = ?, description = ?
      WHERE id = ?
    `, [newTitle, newDesc, categoryId]);

    return { id: categoryId, title: newTitle, description: newDesc };
  }

  // 7. Delete category (Admin only)
  static async delete(id) {
    const categoryId = Number(id);
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
    return result.affectedRows > 0;
  }
}

module.exports = CategoryModel;