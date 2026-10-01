const pool = require('../../database/db');

class UserModel {
  // 1. Get all users (public sees only confirmed users and NO private emails; admin sees all)
  static async findAll(isAdmin = false) {
    if (isAdmin) {
      const [rows] = await pool.execute(`
        SELECT id, login, full_name, email, is_email_confirmed, profile_picture, avatar_config, rating, role, created_at
        FROM users
        ORDER BY id ASC
      `);
      return rows;
    }

    // Public view: hide email for privacy, only confirmed users
    const [rows] = await pool.execute(`
      SELECT id, login, full_name, is_email_confirmed, profile_picture, avatar_config, rating, role, created_at
      FROM users
      WHERE is_email_confirmed = 1
      ORDER BY id ASC
    `);
    return rows;
  }

  // 2. Find user by ID
  static async findById(id, isSelfOrAdmin = false) {
    const userId = Number(id);
    if (isNaN(userId)) return null;

    const emailField = isSelfOrAdmin ? ', email' : '';
    const [rows] = await pool.execute(`
      SELECT id, login, full_name${emailField}, is_email_confirmed, profile_picture, avatar_config, rating, role, created_at
      FROM users
      WHERE id = ?
    `, [userId]);

    return rows[0] || null;
  }

  // 3. Find user by login (includes password_hash for auth checks)
  static async findByLogin(login) {
    if (!login) return null;
    const [rows] = await pool.execute(`
      SELECT id, login, password_hash, full_name, email, is_email_confirmed, profile_picture, avatar_config, rating, role
      FROM users
      WHERE login = ?
    `, [login]);

    return rows[0] || null;
  }

  // 4. Find user by email (includes password_hash for auth checks)
  static async findByEmail(email) {
    if (!email) return null;
    const [rows] = await pool.execute(`
      SELECT id, login, password_hash, full_name, email, is_email_confirmed, profile_picture, avatar_config, rating, role
      FROM users
      WHERE email = ?
    `, [email]);

    return rows[0] || null;
  }

  // 5. Create new user
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
      // Security fix: changing email resets verification status
      fields.push('is_email_confirmed = 0');
    }
    if (updateData.role) {
      fields.push('role = ?');
      values.push(updateData.role);
    }
    if (updateData.avatarConfig !== undefined) {
      fields.push('avatar_config = ?');
      values.push(updateData.avatarConfig ? JSON.stringify(updateData.avatarConfig) : null);
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

  // 7. Update profile picture
  static async updateAvatar(id, profilePicture) {
    const userId = Number(id);
    await pool.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicture, userId]);
    return await this.findById(userId, true);
  }

  // 8. Delete user
  static async delete(id) {
    const userId = Number(id);
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    return result.affectedRows > 0;
  }

  // 9. Confirm email
  static async confirmEmail(userId) {
    await pool.execute('UPDATE users SET is_email_confirmed = 1 WHERE id = ?', [Number(userId)]);
  }

  // 10. Update password hash
  static async updatePassword(userId, newPasswordHash) {
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, Number(userId)]);
  }

  // --- Token Management ---

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

module.exports = UserModel;