const prisma = require('../prismaClient');

class UserModel {
  static async findAll(isAdmin = false) {
    const where = isAdmin ? {} : { isEmailConfirmed: true };

    return await prisma.user.findMany({
      where,
      select: {
        id: true,
        login: true,
        fullName: true,
        email: true,
        isEmailConfirmed: true,
        profilePicture: true,
        avatarConfig: true,
        rating: true,
        role: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        login: true,
        fullName: true,
        email: true,
        isEmailConfirmed: true,
        profilePicture: true,
        avatarConfig: true,
        rating: true,
        role: true,
        createdAt: true,
      },
    });
  }

  static async findByLogin(login) {
    return await prisma.user.findUnique({
      where: { login },
    });
  }

  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  static async create({ login, passwordHash, fullName, email, role = 'user', isEmailConfirmed = false }) {
    return await prisma.user.create({
      data: {
        login,
        passwordHash,
        fullName,
        email,
        role,
        isEmailConfirmed,
      },
    });
  }

  static async updateProfile(id, updateData) {
    return await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        login: true,
        fullName: true,
        email: true,
        isEmailConfirmed: true,
        profilePicture: true,
        avatarConfig: true,
        rating: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  static async updateAvatar(id, profilePicture) {
    return await prisma.user.update({
      where: { id: Number(id) },
      data: { profilePicture },
      select: {
        id: true,
        login: true,
        profilePicture: true,
      },
    });
  }

  static async delete(id) {
    return await prisma.user.delete({
      where: { id: Number(id) },
    });
  }

  static async confirmEmail(userId) {
    return await prisma.user.update({
      where: { id: Number(userId) },
      data: { isEmailConfirmed: true },
    });
  }

  static async updatePassword(userId, newPasswordHash) {
    return await prisma.user.update({
      where: { id: Number(userId) },
      data: { passwordHash: newPasswordHash },
    });
  }


  static async saveToken({ userId, token, type, expiresAt }) {
    return await prisma.token.create({
      data: {
        userId,
        token,
        type,
        expiresAt,
      },
    });
  }

  static async findToken(token, type) {
    return await prisma.token.findFirst({
      where: {
        token,
        type,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  static async deleteToken(tokenId) {
    return await prisma.token.delete({
      where: { id: Number(tokenId) },
    });
  }
}

module.exports = UserModel;