const jwt = require('jsonwebtoken');

// Reads the Bearer token if present, but never blocks guests
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token) {
      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        // Invalid token: continue as guest
      }
    }
  }
  next();
}

module.exports = optionalAuthMiddleware;
