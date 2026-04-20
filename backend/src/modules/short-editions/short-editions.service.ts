import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ShortEditionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.shortEdition.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        readTimeMinutes: true,
        publishedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    const shortEdition = await this.prisma.shortEdition.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        ideaCentral: true,
        whatMatters: true,
        applyToday: true,
        quoteOfWeek: true,
        readTimeMinutes: true,
        publishedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!shortEdition) {
      throw new NotFoundException('Edição curta não encontrada.');
    }

    return shortEdition;
  }
}

