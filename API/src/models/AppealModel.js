const pool = require('../../database/db');

class AppealModel {
  static format(r) {
    return {
      id: r.id,
      postId: r.post_id,
      authorId: r.author_id,
      message: r.message,
      status: r.status,
      adminResponse: r.admin_response,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      post: r.post_title !== undefined ? {
        id: r.post_id,
        title: r.post_title,
        status: r.post_status,
        moderationReason: r.moderation_reason,
        deleteAfter: r.delete_after,
      } : undefined,
      author: r.author_login !== undefined ? { id: r.author_id, login: r.author_login } : undefined,
    };
  }

  static async create({ postId, authorId, message }) {
    const [result] = await pool.execute(
      'INSERT INTO appeals (post_id, author_id, message) VALUES (?, ?, ?)',
      [Number(postId), Number(authorId), message]
    );
    return await this.findById(result.insertId);
  }

  static async findAll({ status } = {}) {
    const params = [];
    let where = '';
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where = 'WHERE a.status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(`
      SELECT a.*, p.title AS post_title, p.status AS post_status, p.moderation_reason, p.delete_after,
        u.login AS author_login
      FROM appeals a
      JOIN posts p ON a.post_id = p.id
      JOIN users u ON a.author_id = u.id
      ${where}
      ORDER BY (a.status = 'pending') DESC, a.created_at DESC, a.id DESC
    `, params);

    return rows.map((r) => this.format(r));
  }

  static async findById(id) {
    const [rows] = await pool.execute(`
      SELECT a.*, p.title AS post_title, p.status AS post_status, p.moderation_reason, p.delete_after,
        u.login AS author_login
      FROM appeals a
      JOIN posts p ON a.post_id = p.id
      JOIN users u ON a.author_id = u.id
      WHERE a.id = ?
    `, [Number(id)]);
    return rows[0] ? this.format(rows[0]) : null;
  }

  static async findForCurrentModeration(postId, moderatedAt) {
    const [rows] = await pool.execute(
      'SELECT * FROM appeals WHERE post_id = ? AND created_at >= ? ORDER BY created_at DESC',
      [Number(postId), moderatedAt]
    );
    return rows.map((r) => this.format(r));
  }

  static async resolve(id, { status, adminResponse = null }) {
    await pool.execute(
      'UPDATE appeals SET status = ?, admin_response = ?, resolved_at = NOW() WHERE id = ?',
      [status, adminResponse, Number(id)]
    );
    return await this.findById(id);
  }

  static async approvePendingForPost(postId, adminResponse) {
    await pool.execute(
      "UPDATE appeals SET status = 'approved', admin_response = ?, resolved_at = NOW() WHERE post_id = ? AND status = 'pending'",
      [adminResponse, Number(postId)]
    );
  }
}

module.exports = AppealModel;
