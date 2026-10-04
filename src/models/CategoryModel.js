const pool = require('../../database/db');

const CATEGORY_FIELDS = `
  c.id, c.title, c.description, c.status, c.created_by, c.rejection_reason, c.created_at,
  u.login AS creator_login
`;

class CategoryModel {
  // Approved categories are public; pending/rejected ones only for their creator and admins
  static isVisibleTo(category, user) {
    if (!category) return false;
    if (category.status === 'approved') return true;
    return Boolean(user) && (user.role === 'admin' || user.id === category.created_by);
  }

  // 1. Get all categories visible to the user (admin may filter by status)
  static async findAll({ user = null, status } = {}) {
    const conditions = [];
    const params = [];

    if (user && user.role === 'admin') {
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        conditions.push('c.status = ?');
        params.push(status);
      }
    } else if (user) {
      conditions.push("(c.status = 'approved' OR c.created_by = ?)");
      params.push(user.id);
    } else {
      conditions.push("c.status = 'approved'");
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(`
      SELECT ${CATEGORY_FIELDS}
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      ${where}
      ORDER BY (c.status = 'pending') DESC, c.id ASC
    `, params);
    return rows;
  }

  // 2. Find category by ID
  static async findById(id) {
    const categoryId = Number(id);
    if (isNaN(categoryId)) return null;

    const [rows] = await pool.execute(`
      SELECT ${CATEGORY_FIELDS}
      FROM categories c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [categoryId]);

    return rows[0] || null;
  }

  // 3. Find category by title (to verify uniqueness)
  static async findByTitle(title) {
    if (!title) return null;
    const [rows] = await pool.execute(`
      SELECT id, title, description, status, created_by, created_at
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
        -- Subqueries instead of JOINs: joining likes and comments together multiplied the vote sum
        (SELECT COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 ELSE -1 END), 0)
           FROM likes l WHERE l.post_id = p.id) AS net_likes,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
      FROM posts p
      JOIN post_categories pc ON p.id = pc.post_id
      JOIN users u ON p.author_id = u.id
      WHERE pc.category_id = ? AND ${statusCondition}
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

  // Returns the ids from the list that point to approved categories
  static async findApprovedIds(ids) {
    const cleanIds = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (cleanIds.length === 0) return [];

    const placeholders = cleanIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT id FROM categories WHERE status = 'approved' AND id IN (${placeholders})`,
      cleanIds
    );
    return rows.map((r) => r.id);
  }

  // 5. Create category (admin: approved at once, user: waits for moderation)
  static async create({ title, description, status = 'approved', createdBy = null }) {
    const [result] = await pool.execute(`
      INSERT INTO categories (title, description, status, created_by)
      VALUES (?, ?, ?, ?)
    `, [title, description || '', status, createdBy]);

    return await this.findById(result.insertId);
  }

  // Moderation decision on a user-suggested category
  static async setStatus(id, status, rejectionReason = null) {
    await pool.execute(
      'UPDATE categories SET status = ?, rejection_reason = ? WHERE id = ?',
      [status, status === 'rejected' ? rejectionReason : null, Number(id)]
    );
    return await this.findById(id);
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

    return await this.findById(categoryId);
  }

  // 7. Delete category (Admin only)
  static async delete(id) {
    const categoryId = Number(id);
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
    return result.affectedRows > 0;
  }
}

module.exports = CategoryModel;