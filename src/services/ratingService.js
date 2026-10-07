const UserModel = require('../models/UserModel');

class RatingService {
  static async recalculateUserRating(userId) {
    try {
      return await UserModel.recalculateRating(userId);
    } catch (error) {
      console.error(`Failed to recalculate rating for user ${userId}:`, error);
      return 0;
    }
  }
}

module.exports = RatingService;
