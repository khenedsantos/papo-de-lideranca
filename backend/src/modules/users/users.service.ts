import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

interface AvatarUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const AVATAR_UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');
const AVATAR_PUBLIC_PATH = '/uploads/avatars';
const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

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

  async getAccountSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        hasCompletedAccess: true,
        lastLoginAt: true,
        subscriptions: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const subscription = user.subscriptions[0] ?? null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isActive: user.isActive,
        hasCompletedAccess: user.hasCompletedAccess,
        lastLoginAt: user.lastLoginAt,
      },
      subscription: {
        plan: subscription?.plan ?? 'FREE',
        status: subscription?.status ?? 'CANCELED',
        label: this.getSubscriptionLabel(subscription?.plan),
        description: this.getSubscriptionDescription(subscription?.plan, subscription?.status),
      },
    };
  }

  async findMe(userId: string) {
    const accountSummary = await this.getAccountSummary(userId);
    const { user, subscription } = accountSummary;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      hasCompletedAccess: user.hasCompletedAccess,
      lastLoginAt: user.lastLoginAt,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
      },
    };
  }

  async updateMe(userId: string, data: UpdateMeDto) {
    const updateData: Prisma.UserUpdateInput = {};

    if (typeof data.name === 'string') {
      updateData.name = data.name;
    }

    if (typeof data.email === 'string') {
      throw new BadRequestException('Alteração de e-mail ainda não está disponível por esta rota.');
    }

    if (!Object.keys(updateData).length) {
      return this.findMe(userId);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.findMe(userId);
  }

  async updateAvatar(userId: string, file: AvatarUploadFile) {
    const extension = AVATAR_EXTENSIONS[file.mimetype];

    if (!extension) {
      throw new BadRequestException('Envie uma imagem em JPG, PNG ou WEBP.');
    }

    await mkdir(AVATAR_UPLOAD_DIR, { recursive: true });

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const filename = `${userId}-${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
    const targetPath = join(AVATAR_UPLOAD_DIR, filename);
    const avatarUrl = `${AVATAR_PUBLIC_PATH}/${filename}`;

    await writeFile(targetPath, file.buffer);

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    await this.removePreviousAvatar(currentUser.avatarUrl);

    return this.findMe(userId);
  }

  private async removePreviousAvatar(avatarUrl?: string | null) {
    if (!avatarUrl || !avatarUrl.startsWith(`${AVATAR_PUBLIC_PATH}/`)) {
      return;
    }

    const filename = avatarUrl.slice(`${AVATAR_PUBLIC_PATH}/`.length);

    if (!filename || filename.includes('/') || filename.includes('\\')) {
      return;
    }

    await unlink(join(AVATAR_UPLOAD_DIR, filename)).catch(() => undefined);
  }

  private getSubscriptionLabel(plan?: string | null) {
    if (plan === 'PREMIUM') {
      return 'plano premium';
    }

    return 'plano free';
  }

  private getSubscriptionDescription(plan?: string | null, status?: string | null) {
    if (status === 'ACTIVE' && plan === 'PREMIUM') {
      return 'acesso completo ao acervo';
    }

    if (status === 'ACTIVE') {
      return 'acesso ao núcleo editorial disponível';
    }

    if (status === 'PAUSED') {
      return 'assinatura pausada no momento';
    }

    return 'assinatura indisponível no momento';
  }
}

