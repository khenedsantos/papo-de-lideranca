import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReadingProgressStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export const READING_PROGRESS_CONTENT_TYPES = [
  'ARTICLE',
  'SHORT_EDITION',
] as const;

export type ReadingProgressContentType =
  (typeof READING_PROGRESS_CONTENT_TYPES)[number];

interface UpsertReadingProgressInput {
  userId: string;
  contentType: ReadingProgressContentType;
  contentId: string;
  progressPercent: number;
}

interface ListReadingProgressInput {
  userId: string;
  contentType?: ReadingProgressContentType;
  status?: ReadingProgressStatus;
}

type ContinueBlockMode = 'CONTINUE_READING' | 'START_NEXT_READING';

type ContentPayload = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  readTimeMinutes: number;
  publishedAt: Date | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
};

type ReadingProgressRecord = Awaited<
  ReturnType<ReadingProgressService['findProgressRecords']>
>[number];

@Injectable()
export class ReadingProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async listProgress(input: ListReadingProgressInput) {
    const progress = await this.findProgressRecords(input);
    return progress.map((item) => this.mapProgress(item));
  }

  async getSummary(userId: string) {
    const progress = await this.findProgressRecords({ userId });
    const currentReading =
      progress.find((item) => item.status === ReadingProgressStatus.IN_PROGRESS) ??
      null;
    const lastReading = currentReading
      ? progress.find((item) => item.id !== currentReading.id) ?? null
      : progress[0] ?? null;
    const completedSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const completedInLast7Days = progress.filter(
      (item) =>
        item.status === ReadingProgressStatus.COMPLETED &&
        item.completedAt &&
        item.completedAt >= completedSince,
    ).length;
    const totalInProgress = progress.filter(
      (item) => item.status === ReadingProgressStatus.IN_PROGRESS,
    ).length;
    const totalCompleted = progress.filter(
      (item) => item.status === ReadingProgressStatus.COMPLETED,
    ).length;
    const continueBlock = await this.buildContinueBlock(progress);
    const journeyBlock = await this.buildJourneyBlock({
      progress,
      continueBlock,
      completedInLast7Days,
      completedSince,
    });

    return {
      journeyBlock,
      continueBlock,
      currentReading: currentReading ? this.mapProgress(currentReading) : null,
      lastReading: lastReading ? this.mapProgress(lastReading) : null,
      completedInLast7Days,
      totalInProgress,
      totalCompleted,
      panorama: {
        totalInProgress,
        totalCompleted,
      },
    };
  }

  async upsertProgress(input: UpsertReadingProgressInput) {
    const requestedProgress = this.normalizeProgress(input.progressPercent);
    const target = await this.resolveContent(input.contentType, input.contentId);
    const currentProgress = await this.findExistingProgress({
      userId: input.userId,
      contentType: input.contentType,
      contentId: target.id,
    });
    const normalizedProgress = Math.max(
      requestedProgress,
      currentProgress?.progressPercent ?? 0,
    );
    const state = this.buildProgressState(normalizedProgress);
    const lastReadAt = new Date();

    if (input.contentType === 'ARTICLE') {
      const progress = await this.prisma.readingProgress.upsert({
        where: {
          userId_articleId: {
            userId: input.userId,
            articleId: target.id,
          },
        },
        create: {
          userId: input.userId,
          articleId: target.id,
          progressPercent: state.progressPercent,
          status: state.status,
          lastReadAt,
          completedAt: state.completedAt,
        },
        update: {
          progressPercent: state.progressPercent,
          status: state.status,
          lastReadAt,
          completedAt: state.completedAt,
        },
        include: {
          article: {
            select: this.contentSelect,
          },
          shortEdition: {
            select: this.contentSelect,
          },
        },
      });

      return this.mapProgress(progress);
    }

    const progress = await this.prisma.readingProgress.upsert({
      where: {
        userId_shortEditionId: {
          userId: input.userId,
          shortEditionId: target.id,
        },
      },
      create: {
        userId: input.userId,
        shortEditionId: target.id,
        progressPercent: state.progressPercent,
        status: state.status,
        lastReadAt,
        completedAt: state.completedAt,
      },
      update: {
        progressPercent: state.progressPercent,
        status: state.status,
        lastReadAt,
        completedAt: state.completedAt,
      },
      include: {
        article: {
          select: this.contentSelect,
        },
        shortEdition: {
          select: this.contentSelect,
        },
      },
    });

    return this.mapProgress(progress);
  }

  private readonly contentSelect = {
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
  } as const;

  private async buildContinueBlock(progress: ReadingProgressRecord[]) {
    const articleProgress = progress.filter((item) => Boolean(item.article));
    const latestArticleReading = articleProgress[0] ?? null;
    const latestArticleId = latestArticleReading?.articleId ?? null;
    const articleInProgress =
      articleProgress.find(
        (item) => item.status === ReadingProgressStatus.IN_PROGRESS,
      ) ?? null;

    if (articleInProgress?.article) {
      return {
        mode: 'CONTINUE_READING' as ContinueBlockMode,
        item: this.mapContinueBlockItem(articleInProgress.article),
        progressPercent: articleInProgress.progressPercent,
        ctaLabel: 'continuar leitura',
      };
    }

    const publishedArticles = await this.findPublishedArticles();

    if (publishedArticles.length === 0) {
      return null;
    }

    const completedArticleIds = new Set(
      articleProgress
        .filter((item) => item.status === ReadingProgressStatus.COMPLETED)
        .map((item) => item.articleId)
        .filter(Boolean),
    );
    const articleProgressIds = new Set(
      articleProgress.map((item) => item.articleId).filter(Boolean),
    );

    const unreadSuggestion = publishedArticles.find(
      (article) =>
        article.id !== latestArticleId && !articleProgressIds.has(article.id),
    );
    const notCompletedSuggestion = publishedArticles.find(
      (article) =>
        article.id !== latestArticleId && !completedArticleIds.has(article.id),
    );
    const fallbackSuggestion =
      publishedArticles.find((article) => article.id !== latestArticleId) ??
      publishedArticles[0];
    const suggestedArticle =
      unreadSuggestion ?? notCompletedSuggestion ?? fallbackSuggestion;
    const isFallbackRevision = !unreadSuggestion && !notCompletedSuggestion;

    return {
      mode: 'START_NEXT_READING' as ContinueBlockMode,
      item: this.mapContinueBlockItem(suggestedArticle),
      progressPercent: null,
      ctaLabel: isFallbackRevision ? 'revisitar leitura' : 'começar nova leitura',
    };
  }

  private async buildJourneyBlock(input: {
    progress: ReadingProgressRecord[];
    continueBlock: Awaited<ReturnType<ReadingProgressService['buildContinueBlock']>>;
    completedInLast7Days: number;
    completedSince: Date;
  }) {
    const { progress, continueBlock, completedInLast7Days, completedSince } =
      input;
    const publishedArticles = await this.findPublishedArticles();
    const articleProgress = progress.filter((item) => Boolean(item.article));
    const articleProgressById = new Map(
      articleProgress
        .filter((item) => item.articleId)
        .map((item) => [item.articleId as string, item]),
    );
    const articleJourneyPercent = publishedArticles.length
      ? Math.round(
          publishedArticles.reduce((sum, article) => {
            const articleProgressRecord = articleProgressById.get(article.id);
            return sum + (articleProgressRecord?.progressPercent ?? 0);
          }, 0) / publishedArticles.length,
        )
      : 0;
    const mode = continueBlock?.mode ?? ('START_NEXT_READING' as ContinueBlockMode);
    const item = continueBlock?.item ?? null;
    const isContinuing = mode === 'CONTINUE_READING';
    const isRevision = continueBlock?.ctaLabel === 'revisitar leitura';
    const journeyPercent = isContinuing
      ? continueBlock?.progressPercent ?? 0
      : articleJourneyPercent;
    const readingDaysThisWeek = new Set(
      progress
        .filter((item) => item.lastReadAt >= completedSince)
        .map((item) => item.lastReadAt.toISOString().slice(0, 10)),
    ).size;
    const dedicatedMinutesThisWeek = progress
      .filter((item) => item.lastReadAt >= completedSince)
      .reduce((sum, item) => {
        const content = item.article ?? item.shortEdition;
        const readTimeMinutes = content?.readTimeMinutes ?? 0;
        return sum + Math.round((readTimeMinutes * item.progressPercent) / 100);
      }, 0);

    return {
      mode,
      headline: isContinuing
        ? 'você está construindo consistência.'
        : 'sua próxima leitura já está pronta.',
      supportText: isContinuing
        ? 'continue avançando um pouco a cada dia. pequenos passos geram grandes mudanças.'
        : 'sem uma leitura em andamento agora, esta é a próxima sugestão editorial para continuar sua linha de raciocínio.',
      ctaLabel: isContinuing
        ? 'continuar leitura'
        : isRevision
          ? 'revisitar leitura'
          : 'começar nova leitura',
      journeyPercent,
      readingDaysThisWeek,
      dedicatedMinutesThisWeek,
      completedThisWeek: completedInLast7Days,
      item,
      nextStepText: isContinuing
        ? 'voltar ao trecho em que clareza e respeito deixam de competir na conversa.'
        : isRevision
          ? 'revisitar o acervo concluído com um olhar novo e recuperar um ponto útil.'
          : 'começar pelo artigo sugerido para manter a sequência editorial sem voltar ao item já concluído.',
    };
  }

  private async findPublishedArticles() {
    return this.prisma.article.findMany({
      where: {
        isPublished: true,
      },
      orderBy: [
        {
          publishedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      select: this.contentSelect,
    });
  }

  private async findProgressRecords(input: ListReadingProgressInput) {
    return this.prisma.readingProgress.findMany({
      where: {
        userId: input.userId,
        status: input.status,
        articleId:
          input.contentType === 'ARTICLE'
            ? {
                not: null,
              }
            : undefined,
        shortEditionId:
          input.contentType === 'SHORT_EDITION'
            ? {
                not: null,
              }
            : undefined,
      },
      orderBy: [
        {
          lastReadAt: 'desc',
        },
        {
          updatedAt: 'desc',
        },
      ],
      include: {
        article: {
          select: this.contentSelect,
        },
        shortEdition: {
          select: this.contentSelect,
        },
      },
    });
  }

  private async resolveContent(
    contentType: ReadingProgressContentType,
    contentId: string,
  ) {
    if (contentType === 'ARTICLE') {
      const article = await this.prisma.article.findFirst({
        where: {
          id: contentId,
          isPublished: true,
        },
        select: {
          id: true,
        },
      });

      if (!article) {
        throw new NotFoundException('Artigo não encontrado.');
      }

      return article;
    }

    const shortEdition = await this.prisma.shortEdition.findFirst({
      where: {
        id: contentId,
        isPublished: true,
      },
      select: {
        id: true,
      },
    });

    if (!shortEdition) {
      throw new NotFoundException('Edição curta não encontrada.');
    }

    return shortEdition;
  }

  private findExistingProgress(input: {
    userId: string;
    contentType: ReadingProgressContentType;
    contentId: string;
  }) {
    if (input.contentType === 'ARTICLE') {
      return this.prisma.readingProgress.findUnique({
        where: {
          userId_articleId: {
            userId: input.userId,
            articleId: input.contentId,
          },
        },
        select: {
          progressPercent: true,
        },
      });
    }

    return this.prisma.readingProgress.findUnique({
      where: {
        userId_shortEditionId: {
          userId: input.userId,
          shortEditionId: input.contentId,
        },
      },
      select: {
        progressPercent: true,
      },
    });
  }

  private normalizeProgress(progressPercent: number) {
    if (!Number.isFinite(progressPercent)) {
      throw new BadRequestException('progressPercent precisa ser numérico.');
    }

    const normalized = Math.round(progressPercent);

    if (normalized < 0 || normalized > 100) {
      throw new BadRequestException('progressPercent deve estar entre 0 e 100.');
    }

    return normalized;
  }

  private buildProgressState(progressPercent: number) {
    if (progressPercent >= 100) {
      return {
        progressPercent: 100,
        status: ReadingProgressStatus.COMPLETED,
        completedAt: new Date(),
      };
    }

    if (progressPercent <= 0) {
      return {
        progressPercent: 0,
        status: ReadingProgressStatus.NOT_STARTED,
        completedAt: null,
      };
    }

    return {
      progressPercent,
      status: ReadingProgressStatus.IN_PROGRESS,
      completedAt: null,
    };
  }

  private mapProgress(progress: ReadingProgressRecord) {
    const contentType = progress.article
      ? 'ARTICLE'
      : ('SHORT_EDITION' as ReadingProgressContentType);
    const content = (progress.article ?? progress.shortEdition) as ContentPayload | null;

    if (!content) {
      throw new BadRequestException('Progresso sem conteúdo associado.');
    }

    return {
      id: progress.id,
      contentType,
      contentId: content.id,
      progressPercent: progress.progressPercent,
      status: progress.status,
      lastReadAt: progress.lastReadAt,
      completedAt: progress.completedAt,
      content: {
        id: content.id,
        title: content.title,
        slug: content.slug,
        excerpt: content.excerpt,
        readTimeMinutes: content.readTimeMinutes,
        publishedAt: content.publishedAt,
        category: content.category,
      },
    };
  }

  private mapContinueBlockItem(content: ContentPayload) {
    return {
      contentType: 'ARTICLE' as const,
      contentId: content.id,
      title: content.title,
      slug: content.slug,
      excerpt: content.excerpt,
      readTimeMinutes: content.readTimeMinutes,
      publishedAt: content.publishedAt,
      category: content.category,
    };
  }
}
