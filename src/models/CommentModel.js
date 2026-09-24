const prisma = require('../prismaClient');

class CommentModel {
  static async findByPostId(postId) {
    return await prisma.comment.findMany({
      where: {
        postId: Number(postId),
        parentId: null,
      },
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
        likes: true,
        _count: {
          select: { likes: true },
        },
        replies: {
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
            likes: true,
            _count: {
              select: { likes: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [
        { likes: { _count: 'asc' } },
        { createdAt: 'asc' },
      ],
    });
  }

  static async findById(id) {
    return await prisma.comment.findUnique({
      where: { id: Number(id) },
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
        likes: true,
        replies: true,
        _count: {
          select: { likes: true },
        },
      },
    });
  }

  static async create({ authorId, postId, content, parentId = null }) {
    return await prisma.comment.create({
      data: {
        authorId: Number(authorId),
        postId: Number(postId),
        parentId: parentId ? Number(parentId) : null,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            login: true,
            fullName: true,
            profilePicture: true,
          },
        },
      },
    });
  }

  static async updateStatus(id, status) {
    return await prisma.comment.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        author: {
          select: { id: true, login: true },
        },
      },
    });
  }

  static async delete(id) {
    return await prisma.comment.delete({
      where: { id: Number(id) },
    });
  }
}

module.exports = CommentModel;