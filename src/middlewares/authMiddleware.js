const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authorization required. Please log in.',
    });
  }

  // Extract clean token
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({
      error: 'Authorization token is missing.',
    });
  }

  try {
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET);

    // Security fix: verify that user still exists in database and get fresh role
    const freshUser = await UserModel.findById(decodedUser.id, true);
    if (!freshUser) {
      return res.status(401).json({
        error: 'Unauthorized: User account no longer exists or was deleted.',
      });
    }

    req.user = freshUser;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired authorization token.',
    });
  }
}

module.exports = authMiddleware;