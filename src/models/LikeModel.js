const prisma = require('../prismaClient');

class LikeModel {
  static async findPostLikes(postId) {
    return await prisma.like.findMany({
      where: { postId: Number(postId) },
      include: {
        author: {
          select: {
            id: true,
            login: true,
            fullName: true,
            profilePicture: true,
            rating: true,
          },
        },
      },
    });
  }

  static async findCommentLikes(commentId) {
    return await prisma.like.findMany({
      where: { commentId: Number(commentId) },
      include: {
        author: {
          select: {
            id: true,
            login: true,
            fullName: true,
            profilePicture: true,
            rating: true,
          },
        },
      },
    });
  }

  static async voteOnPost(authorId, postId, type) {
    const userId = Number(authorId);
    const pId = Number(postId);

    const existingVote = await prisma.like.findUnique({
      where: {
        user_post_like_unique: {
          authorId: userId,
          postId: pId,
        },
      },
    });

    if (existingVote) {
      return await prisma.like.update({
        where: { id: existingVote.id },
        data: { type },
      });
    }

    return await prisma.like.create({
      data: {
        authorId: userId,
        postId: pId,
        type,
      },
    });
  }

  static async removePostVote(authorId, postId) {
    const existingVote = await prisma.like.findUnique({
      where: {
        user_post_like_unique: {
          authorId: Number(authorId),
          postId: Number(postId),
        },
      },
    });

    if (!existingVote) return null;

    return await prisma.like.delete({
      where: { id: existingVote.id },
    });
  }

  static async voteOnComment(authorId, commentId, type) {
    const userId = Number(authorId);
    const cId = Number(commentId);

    const existingVote = await prisma.like.findUnique({
      where: {
        user_comment_like_unique: {
          authorId: userId,
          commentId: cId,
        },
      },
    });

    if (existingVote) {
      return await prisma.like.update({
        where: { id: existingVote.id },
        data: { type },
      });
    }

    return await prisma.like.create({
      data: {
        authorId: userId,
        commentId: cId,
        type,
      },
    });
  }

  static async removeCommentVote(authorId, commentId) {
    const existingVote = await prisma.like.findUnique({
      where: {
        user_comment_like_unique: {
          authorId: Number(authorId),
          commentId: Number(commentId),
        },
      },
    });

    if (!existingVote) return null;

    return await prisma.like.delete({
      where: { id: existingVote.id },
    });
  }
}

module.exports = LikeModel;