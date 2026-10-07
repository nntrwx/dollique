const pool = require('../../database/db');

class CommentModel {
  static isVisibleTo(comment, user) {
    if (!comment) return false;
    if (comment.status === 'active') return true;
    return Boolean(user) && (user.role === 'admin' || user.id === comment.authorId);
  }

  static async findByPostId(postId, currentUser = null) {
    const pId = Number(postId);
    if (isNaN(pId)) return [];

    let statusCondition = "c.status = 'active'";
    const queryParams = [pId];

    if (currentUser && currentUser.role === 'admin') {
      statusCondition = "1=1"; 
    } else if (currentUser) {
      statusCondition = "(c.status = 'active' OR c.author_id = ?)";
      queryParams.push(currentUser.id);
    }

    const query = `
      SELECT 
        c.id, c.author_id, c.post_id, c.parent_id, c.content, c.status, c.created_at, c.updated_at,
        u.id AS author_user_id, u.login AS author_login, u.full_name AS author_name,
        u.profile_picture AS author_avatar, u.rating AS author_rating,
        COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 WHEN l.type = 'dislike' THEN -1 ELSE 0 END), 0) AS net_likes
      FROM comments c
      JOIN users u ON c.author_id = u.id
      LEFT JOIN likes l ON c.id = l.comment_id
      WHERE c.post_id = ? AND ${statusCondition}
      GROUP BY c.id, u.id
      ORDER BY c.created_at ASC
    `;

    const [rows] = await pool.execute(query, queryParams);

    const commentMap = {};
    const formattedList = rows.map((r) => {
      const item = {
        id: r.id,
        authorId: r.author_id,
        postId: r.post_id,
        parentId: r.parent_id,
        content: r.content,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        netLikes: Number(r.net_likes) || 0,
        author: {
          id: r.author_user_id,
          login: r.author_login,
          fullName: r.author_name,
          profilePicture: r.author_avatar,
          rating: r.author_rating,
        },
        replies: [],
      };
      commentMap[item.id] = item;
      return item;
    });

    const rootComments = [];
    formattedList.forEach((comment) => {
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  static async findById(id) {
    const commentId = Number(id);
    if (isNaN(commentId)) return null;

    const [rows] = await pool.execute(`
      SELECT 
        c.id, c.author_id, c.post_id, c.parent_id, c.content, c.status, c.created_at, c.updated_at,
        u.id AS author_user_id, u.login AS author_login, u.full_name AS author_name,
        u.profile_picture AS author_avatar, u.rating AS author_rating
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.id = ?
    `, [commentId]);

    if (!rows[0]) return null;

    const r = rows[0];
    return {
      id: r.id,
      authorId: r.author_id,
      postId: r.post_id,
      parentId: r.parent_id,
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      author: {
        id: r.author_user_id,
        login: r.author_login,
        fullName: r.author_name,
        profilePicture: r.author_avatar,
        rating: r.author_rating,
      },
    };
  }

  static async create({ authorId, postId, content, parentId = null }) {
    const [result] = await pool.execute(`
      INSERT INTO comments (author_id, post_id, parent_id, content, status)
      VALUES (?, ?, ?, ?, 'active')
    `, [Number(authorId), Number(postId), parentId ? Number(parentId) : null, content]);

    return await this.findById(result.insertId);
  }

  static async updateStatus(id, status) {
    const commentId = Number(id);
    await pool.execute('UPDATE comments SET status = ? WHERE id = ?', [status, commentId]);
    return await this.findById(commentId);
  }

  static async updateContent(id, content) {
    const commentId = Number(id);
    await pool.execute('UPDATE comments SET content = ? WHERE id = ?', [content, commentId]);
    return await this.findById(commentId);
  }

  static async delete(id) {
    const commentId = Number(id);
    const [result] = await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);
    return result.affectedRows > 0;
  }
}

module.exports = CommentModel;