const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authorization required. Please log in.',
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({
      error: 'Authorization token is missing.',
    });
  }

  try {
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedUser;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired authorization token.',
    });
  }
}

module.exports = authMiddleware;