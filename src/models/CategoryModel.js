const prisma = require('../prismaClient');

class CategoryModel {
  static async findAll() {
    return await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });
  }

  static async findById(id) {
    return await prisma.category.findUnique({
      where: { id: Number(id) },
    });
  }

  static async findByTitle(title) {
    return await prisma.category.findUnique({
      where: { title },
    });
  }

  static async findPostsByCategoryId(categoryId) {
    const postCategories = await prisma.postCategory.findMany({
      where: { categoryId: Number(categoryId) },
      include: {
        post: {
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
            categories: {
              include: {
                category: true,
              },
            },
            likes: true,
          },
        },
      },
    });

    return postCategories.map((pc) => pc.post);
  }

  static async create({ title, description }) {
    return await prisma.category.create({
      data: {
        title,
        description,
      },
    });
  }

  static async update(id, { title, description }) {
    const data = {};
    if (title) data.title = title;
    if (description !== undefined) data.description = description;

    return await prisma.category.update({
      where: { id: Number(id) },
      data,
    });
  }

  static async delete(id) {
    return await prisma.category.delete({
      where: { id: Number(id) },
    });
  }
}

module.exports = CategoryModel;