const TokenService = require('../services/tokenService');

// Reads the Bearer token if present, but never blocks guests
async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = TokenService.extract(req);
    if (token) {
      // Invalid or revoked token: continue as guest
      const user = await TokenService.verify(token);
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = optionalAuthMiddleware;
