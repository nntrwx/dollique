const UserModel = require('../models/UserModel');
const TokenService = require('../services/tokenService');

async function authMiddleware(req, res, next) {
  const token = TokenService.extract(req);
  if (!token) {
    return res.status(401).json({
      error: 'Authorization required. Please log in.',
    });
  }

  try {
    const freshUser = await TokenService.verify(token);
    if (!freshUser) {
      return res.status(401).json({
        error: 'Invalid, expired or revoked authorization token. Please log in again.',
      });
    }

    if (UserModel.isBanned(freshUser)) {
      return res.status(403).json({
        error: `Your account is banned until ${new Date(freshUser.banned_until).toISOString()}.`,
        bannedUntil: freshUser.banned_until,
        reason: freshUser.ban_reason,
      });
    }

    req.user = freshUser;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
