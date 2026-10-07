const pool = require('../../database/db');

class ViolationModel {
  static format(r) {
    return {
      id: r.id,
      userId: r.user_id,
      type: r.type,
      targetId: r.target_id,
      reason: r.reason,
      createdBy: r.created_by,
      createdByLogin: r.created_by_login || null,
      revoked: Boolean(r.revoked),
      createdAt: r.created_at,
    };
  }

  static async create({ userId, type, targetId = null, reason = null, createdBy = null }) {
    const [result] = await pool.execute(
      'INSERT INTO violations (user_id, type, target_id, reason, created_by) VALUES (?, ?, ?, ?, ?)',
      [Number(userId), type, targetId ? Number(targetId) : null, reason, createdBy ? Number(createdBy) : null]
    );
    return result.insertId;
  }

  static async revokeByTarget(type, targetId) {
    const [result] = await pool.execute(
      'UPDATE violations SET revoked = 1 WHERE type = ? AND target_id = ? AND revoked = 0',
      [type, Number(targetId)]
    );
    return result.affectedRows;
  }

  static async countActive(userId, since = null) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM violations
       WHERE user_id = ? AND revoked = 0 AND (? IS NULL OR created_at > ?)`,
      [Number(userId), since, since]
    );
    return Number(rows[0].cnt);
  }

  static async findByUser(userId) {
    const [rows] = await pool.execute(
      `SELECT v.*, u.login AS created_by_login
       FROM violations v
       LEFT JOIN users u ON u.id = v.created_by
       WHERE v.user_id = ?
       ORDER BY v.created_at DESC, v.id DESC`,
      [Number(userId)]
    );
    return rows.map((r) => this.format(r));
  }
}

module.exports = ViolationModel;
