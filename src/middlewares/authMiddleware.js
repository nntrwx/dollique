const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ');

  if (!token) {
    return res.status(401).json({
      error: 'You must be logged in. Please log in to your account.',
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