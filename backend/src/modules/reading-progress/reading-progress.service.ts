import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface UpsertReadingProgressInput {
  userId: string;
  articleId?: string;
  shortEditionId?: string;
  progressPercent: number;
}

@Injectable()
export class ReadingProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProgress(input: UpsertReadingProgressInput) {
    const targetCount = [input.articleId, input.shortEditionId].filter(Boolean).length;

    if (targetCount !== 1) {
      throw new BadRequestException(
        'ReadingProgress exige exatamente um alvo entre articleId e shortEditionId.',
      );
    }

    if (input.progressPercent < 0 || input.progressPercent > 100) {
      throw new BadRequestException('progressPercent deve estar entre 0 e 100.');
    }

    return this.prisma.readingProgress.create({
      data: {
        userId: input.userId,
        articleId: input.articleId,
        shortEditionId: input.shortEditionId,
        progressPercent: input.progressPercent,
        lastReadAt: new Date(),
      },
    });
  }
}

