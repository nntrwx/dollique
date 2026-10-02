const pool = require('../../database/db');

class NotificationModel {
  static format(r) {
    return {
      id: r.id,
      userId: r.user_id,
      postId: r.post_id,
      type: r.type,
      message: r.message,
      isRead: Boolean(r.is_read),
      createdAt: r.created_at,
    };
  }

  static async create({ userId, postId = null, type, message }) {
    const [result] = await pool.execute(
      'INSERT INTO notifications (user_id, post_id, type, message) VALUES (?, ?, ?, ?)',
      [Number(userId), postId ? Number(postId) : null, type, message]
    );
    return result.insertId;
  }

  static async findByUser(userId, { unreadOnly = false } = {}) {
    const unreadCondition = unreadOnly ? 'AND is_read = 0' : '';
    const [rows] = await pool.execute(
      `SELECT * FROM notifications WHERE user_id = ? ${unreadCondition} ORDER BY created_at DESC, id DESC`,
      [Number(userId)]
    );
    return rows.map((r) => this.format(r));
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM notifications WHERE id = ?', [Number(id)]);
    return rows[0] ? this.format(rows[0]) : null;
  }

  static async markAsRead(id) {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [Number(id)]);
    return await this.findById(id);
  }

  static async markAllAsRead(userId) {
    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [Number(userId)]
    );
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM notifications WHERE id = ?', [Number(id)]);
    return result.affectedRows > 0;
  }
}

module.exports = NotificationModel;
