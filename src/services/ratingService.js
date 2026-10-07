const pool = require('../../database/db');

class RatingService {
  static async recalculateUserRating(userId) {
    try {
      const targetUserId = Number(userId);

      const query = `
        SELECT 
          COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 WHEN l.type = 'dislike' THEN -1 ELSE 0 END), 0) AS total_rating
        FROM likes l
        LEFT JOIN posts p ON l.post_id = p.id
        LEFT JOIN comments c ON l.comment_id = c.id
        WHERE p.author_id = ? OR c.author_id = ?
      `;

      const [rows] = await pool.execute(query, [targetUserId, targetUserId]);
      const newRating = Number(rows[0].total_rating) || 0;

      await pool.execute('UPDATE users SET rating = ? WHERE id = ?', [newRating, targetUserId]);

      return newRating;
    } catch (error) {
      console.error(`Failed to recalculate rating for user ${userId}:`, error);
      return 0;
    }
  }
}

module.exports = RatingService;