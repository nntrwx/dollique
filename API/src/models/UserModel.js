const pool = require('../../database/db');

const DEFAULT_AVATAR = '/uploads/avatars/default.png';

class UserModel {
  static async findAll(isAdmin = false) {
    if (isAdmin) {
      const [rows] = await pool.execute(`
        SELECT id, login, full_name, email, is_email_confirmed, profile_picture, doll_config, use_doll_as_avatar, bio, rating, role,
               banned_until, ban_reason, created_at,
               (SELECT COUNT(*) FROM violations v
                 WHERE v.user_id = users.id AND v.revoked = 0
                   AND (users.strikes_reset_at IS NULL OR v.created_at > users.strikes_reset_at)) AS active_strikes
        FROM users
        ORDER BY id ASC
      `);
      return rows;
    }

    const [rows] = await pool.execute(`
      SELECT id, login, full_name, is_email_confirmed, profile_picture, doll_config, use_doll_as_avatar, bio, rating, role, created_at
      FROM users
      WHERE is_email_confirmed = 1
      ORDER BY id ASC
    `);
    return rows;
  }

  static async findById(id, isSelfOrAdmin = false) {
    const userId = Number(id);
    if (isNaN(userId)) return null;

    const privateFields = isSelfOrAdmin ? ', email, banned_until, ban_reason, token_version' : '';
    const [rows] = await pool.execute(`
      SELECT id, login, full_name${privateFields}, is_email_confirmed, profile_picture, doll_config, use_doll_as_avatar, bio, rating, role, created_at
      FROM users
      WHERE id = ?
    `, [userId]);

    return rows[0] || null;
  }

  static async findDollConfigs() {
    const [rows] = await pool.execute('SELECT id, doll_config FROM users WHERE doll_config IS NOT NULL');
    return rows;
  }

  static async findByLogin(login) {
    if (!login) return null;
    const [rows] = await pool.execute(`
      SELECT id, login, password_hash, full_name, email, is_email_confirmed, profile_picture, doll_config, rating, role,
             banned_until, ban_reason, token_version
      FROM users
      WHERE login = ?
    `, [login]);

    return rows[0] || null;
  }

  static async findByEmail(email) {
    if (!email) return null;
    const [rows] = await pool.execute(`
      SELECT id, login, password_hash, full_name, email, is_email_confirmed, profile_picture, doll_config, rating, role,
             banned_until, ban_reason, token_version
      FROM users
      WHERE email = ?
    `, [email]);

    return rows[0] || null;
  }

  static async create({ login, passwordHash, fullName, email, role = 'user', isEmailConfirmed = false }) {
    const [result] = await pool.execute(`
      INSERT INTO users (login, password_hash, full_name, email, role, is_email_confirmed)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [login, passwordHash, fullName, email, role, isEmailConfirmed ? 1 : 0]);

    return {
      id: result.insertId,
      login,
      fullName,
      email,
      role,
      isEmailConfirmed,
    };
  }

  // 6. Update user profile
  static async updateProfile(id, updateData) {
    const userId = Number(id);
    const fields = [];
    const values = [];

    if (updateData.login) {
      fields.push('login = ?');
      values.push(updateData.login);
    }
    if (updateData.fullName) {
      fields.push('full_name = ?');
      values.push(updateData.fullName);
    }
    if (updateData.email) {
      fields.push('email = ?');
      values.push(updateData.email);
      if (!updateData.keepEmailConfirmed) fields.push('is_email_confirmed = 0');
    }
    if (updateData.role) {
      fields.push('role = ?');
      values.push(updateData.role);
    }
    if (updateData.dollConfig !== undefined) {
      fields.push('doll_config = ?');
      values.push(updateData.dollConfig ? JSON.stringify(updateData.dollConfig) : null);
    }
    if (updateData.useDollAsAvatar !== undefined) {
      fields.push('use_doll_as_avatar = ?');
      values.push(updateData.useDollAsAvatar);
    }
    if (updateData.bio !== undefined) {
      fields.push('bio = ?');
      values.push(updateData.bio || null);
    }
    if (updateData.profilePicture) {
      fields.push('profile_picture = ?');
      values.push(updateData.profilePicture);
    }

    if (fields.length === 0) {
      return await this.findById(userId, true);
    }

    values.push(userId);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    return await this.findById(userId, true);
  }

  static async resetProfileFields(id, fields) {
    const userId = Number(id);
    const sets = [];
    if (fields.includes('profile_picture')) sets.push(`profile_picture = '${DEFAULT_AVATAR}'`);
    if (fields.includes('full_name')) sets.push('full_name = login');
    if (fields.includes('bio')) sets.push('bio = NULL');

    if (sets.length > 0) {
      await pool.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [userId]);
    }
    return await this.findById(userId, true);
  }

  static async setBan(id, days, reason) {
    await pool.execute(`
      UPDATE users
      SET banned_until = NOW() + INTERVAL ? DAY, ban_reason = ?, strikes_reset_at = NOW()
      WHERE id = ?
    `, [Number(days), reason || null, Number(id)]);
  }

  static async bumpTokenVersion(id) {
    await pool.execute('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [Number(id)]);
  }

  static async clearBan(id) {
    await pool.execute(
      'UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE id = ?',
      [Number(id)]
    );
  }

  static async getStrikesResetAt(id) {
    const [rows] = await pool.execute('SELECT strikes_reset_at FROM users WHERE id = ?', [Number(id)]);
    return rows[0] ? rows[0].strikes_reset_at : null;
  }

  static isBanned(user) {
    return Boolean(user && user.banned_until && new Date(user.banned_until) > new Date());
  }

  // Rating = likes minus dislikes on all posts and comments of the user
  static async recalculateRating(id) {
    const userId = Number(id);
    await pool.execute(`
      UPDATE users SET rating = (
        SELECT COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 ELSE -1 END), 0)
        FROM likes l
        LEFT JOIN posts p ON l.post_id = p.id
        LEFT JOIN comments c ON l.comment_id = c.id
        WHERE p.author_id = ? OR c.author_id = ?
      )
      WHERE id = ?
    `, [userId, userId, userId]);
    const [rows] = await pool.execute('SELECT rating FROM users WHERE id = ?', [userId]);
    return rows[0] ? rows[0].rating : 0;
  }

  static async delete(id) {
    const userId = Number(id);
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    return result.affectedRows > 0;
  }

  static async confirmEmail(userId) {
    await pool.execute('UPDATE users SET is_email_confirmed = 1 WHERE id = ?', [Number(userId)]);
  }

  static async updatePassword(userId, newPasswordHash) {
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, Number(userId)]);
  }

  static async saveToken({ userId, token, type, expiresAt }) {
    const [result] = await pool.execute(`
      INSERT INTO tokens (user_id, token, type, expires_at)
      VALUES (?, ?, ?, ?)
    `, [Number(userId), token, type, expiresAt]);

    return { id: result.insertId, userId, token, type, expiresAt };
  }

  static async findToken(token, type) {
    const [rows] = await pool.execute(`
      SELECT t.*, u.id as user_id, u.login, u.email
      FROM tokens t
      JOIN users u ON t.user_id = u.id
      WHERE t.token = ? AND t.type = ? AND t.expires_at > NOW()
    `, [token, type]);

    if (!rows[0]) return null;

    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      token: rows[0].token,
      type: rows[0].type,
      expiresAt: rows[0].expires_at,
      user: {
        id: rows[0].user_id,
        login: rows[0].login,
        email: rows[0].email,
      },
    };
  }

  static async deleteToken(tokenId) {
    await pool.execute('DELETE FROM tokens WHERE id = ?', [Number(tokenId)]);
  }
}

UserModel.DEFAULT_AVATAR = DEFAULT_AVATAR;

module.exports = UserModel;