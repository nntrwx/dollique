const TokenService = require('../services/tokenService');

async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = TokenService.extract(req);
    if (token) {
      const user = await TokenService.verify(token);
      if (user) req.user = user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = optionalAuthMiddleware;
