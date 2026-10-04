const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

// JWT helpers. A token is valid only while its "tv" matches users.token_version,
// so logout or a password reset revokes every token issued before it.
class TokenService {
  static sign(user) {
    return jwt.sign(
      { id: user.id, login: user.login, role: user.role, tv: user.token_version || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static extract(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;
    return authHeader.replace(/^Bearer\s+/i, '').trim() || null;
  }

  // Returns the fresh user for a valid, not revoked token, otherwise null
  static async verify(token) {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }

    const user = await UserModel.findById(decoded.id, true);
    if (!user || (decoded.tv || 0) !== user.token_version) return null;
    return user;
  }
}

module.exports = TokenService;
