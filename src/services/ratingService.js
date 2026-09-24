const prisma = require('../prismaClient');

class RatingService {
  static async recalculateUserRating(userId) {
    try {
      const targetUserId = Number(userId);

      const postLikes = await prisma.like.findMany({
        where: {
          post: {
            authorId: targetUserId,
          },
        },
        select: { type: true },
      });

      const commentLikes = await prisma.like.findMany({
        where: {
          comment: {
            authorId: targetUserId,
          },
        },
        select: { type: true },
      });

      const allVotes = [...postLikes, ...commentLikes];

      const totalLikes = allVotes.filter((v) => v.type === 'like').length;
      const totalDislikes = allVotes.filter((v) => v.type === 'dislike').length;
      const newRating = totalLikes - totalDislikes;

      await prisma.user.update({
        where: { id: targetUserId },
        data: { rating: newRating },
      });

      return newRating;
    } catch (error) {
      console.error(`Failed to recalculate rating for user ${userId}:`, error);
    }
  }
}

module.exports = RatingService;