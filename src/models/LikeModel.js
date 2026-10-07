const pool = require('../../database/db');

class LikeModel {
  static async findPostLikes(postId) {
    const pId = Number(postId);
    if (isNaN(pId)) return [];

    const [rows] = await pool.execute(`
      SELECT 
        l.id, l.author_id, l.post_id, l.comment_id, l.type, l.created_at,
        u.id AS author_user_id, u.login AS author_login, u.full_name AS author_name,
        u.profile_picture AS author_avatar, u.rating AS author_rating
      FROM likes l
      JOIN users u ON l.author_id = u.id
      WHERE l.post_id = ?
      ORDER BY l.created_at DESC
    `, [pId]);

    return rows.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      postId: r.post_id,
      commentId: r.comment_id,
      type: r.type,
      createdAt: r.created_at,
      author: {
        id: r.author_user_id,
        login: r.author_login,
        fullName: r.author_name,
        profilePicture: r.author_avatar,
        rating: r.author_rating,
      },
    }));
  }

  static async findCommentLikes(commentId) {
    const cId = Number(commentId);
    if (isNaN(cId)) return [];

    const [rows] = await pool.execute(`
      SELECT 
        l.id, l.author_id, l.post_id, l.comment_id, l.type, l.created_at,
        u.id AS author_user_id, u.login AS author_login, u.full_name AS author_name,
        u.profile_picture AS author_avatar, u.rating AS author_rating
      FROM likes l
      JOIN users u ON l.author_id = u.id
      WHERE l.comment_id = ?
      ORDER BY l.created_at DESC
    `, [cId]);

    return rows.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      postId: r.post_id,
      commentId: r.comment_id,
      type: r.type,
      createdAt: r.created_at,
      author: {
        id: r.author_user_id,
        login: r.author_login,
        fullName: r.author_name,
        profilePicture: r.author_avatar,
        rating: r.author_rating,
      },
    }));
  }

  static async voteOnPost(authorId, postId, type) {
    const userId = Number(authorId);
    const pId = Number(postId);

    await pool.execute(`
      INSERT INTO likes (author_id, post_id, comment_id, type)
      VALUES (?, ?, NULL, ?)
      ON DUPLICATE KEY UPDATE type = VALUES(type)
    `, [userId, pId, type]);

    const [rows] = await pool.execute(`
      SELECT * FROM likes WHERE author_id = ? AND post_id = ?
    `, [userId, pId]);

    return rows[0] || null;
  }

  static async removePostVote(authorId, postId) {
    const userId = Number(authorId);
    const pId = Number(postId);

    const [result] = await pool.execute(`
      DELETE FROM likes WHERE author_id = ? AND post_id = ?
    `, [userId, pId]);

    return result.affectedRows > 0;
  }

  static async voteOnComment(authorId, commentId, type) {
    const userId = Number(authorId);
    const cId = Number(commentId);

    await pool.execute(`
      INSERT INTO likes (author_id, post_id, comment_id, type)
      VALUES (?, NULL, ?, ?)
      ON DUPLICATE KEY UPDATE type = VALUES(type)
    `, [userId, cId, type]);

    const [rows] = await pool.execute(`
      SELECT * FROM likes WHERE author_id = ? AND comment_id = ?
    `, [userId, cId]);

    return rows[0] || null;
  }

  static async removeCommentVote(authorId, commentId) {
    const userId = Number(authorId);
    const cId = Number(commentId);

    const [result] = await pool.execute(`
      DELETE FROM likes WHERE author_id = ? AND comment_id = ?
    `, [userId, cId]);

    return result.affectedRows > 0;
  }
}

module.exports = LikeModel;