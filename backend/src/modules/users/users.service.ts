import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByResetToken(resetPasswordToken: string) {
    return this.prisma.user.findFirst({
      where: { resetPasswordToken },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  updateCredentials(userId: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  saveResetToken(
    userId: string,
    data: Pick<Prisma.UserUpdateInput, 'resetPasswordToken' | 'resetPasswordExpiresAt'>,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hasCompletedAccess: true,
        lastLoginAt: true,
        subscriptions: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasCompletedAccess: user.hasCompletedAccess,
      lastLoginAt: user.lastLoginAt,
      subscription: user.subscriptions[0] ?? null,
    };
  }
}
