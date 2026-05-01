import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReadingProgressStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export const READING_PROGRESS_CONTENT_TYPES = [
  'ARTICLE',
  'SHORT_EDITION',
] as const;

export type ReadingProgressContentType =
  (typeof READING_PROGRESS_CONTENT_TYPES)[number];

export function normalizeReadingProgressContentType(
  type: unknown,
): ReadingProgressContentType | undefined {
  const value = String(type || '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');

  if (value === 'article') return 'ARTICLE';

  if (
    value === 'short-edition' ||
    value === 'shortedition' ||
    value === 'short-editions' ||
    value === 'edition'
  ) {
    return 'SHORT_EDITION';
  }

  return undefined;
}

const LOCAL_TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_WEEKLY_TARGET = 5;
const MAX_WEEKLY_TARGET = 50;
const WEEKDAY_KEYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const;

interface UpsertReadingProgressInput {
  userId: string;
  contentType: ReadingProgressContentType;
  contentId?: string;
  slug?: string;
  progressPercent: number;
  completed?: boolean;
}

interface ListReadingProgressInput {
  userId: string;
  contentType?: ReadingProgressContentType;
  status?: ReadingProgressStatus;
}

interface UpdateReadingGoalInput {
  userId: string;
  weeklyTarget: number;
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

type DailyActivityPayload = {
  activityDate: Date;
  minutesRead: number;
  completedCount: number;
};

@Injectable()
export class ReadingProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async listProgress(input: ListReadingProgressInput) {
    const progress = await this.findProgressRecords(input);
    return progress.map((item) => this.mapProgress(item));
  }

  async getSummary(userId: string) {
    const progress = await this.findProgressRecords({ userId });
    const progressStats = this.calculateProgressStats(progress);
    const weeklyTarget = await this.getWeeklyTarget(userId);
    const weekWindow = this.getCurrentWeekWindow();
    const weekActivities = await this.findActivitiesInRange({
      userId,
      startDateKey: weekWindow.startDateKey,
      endDateKey: weekWindow.endDateKey,
    });
    const allActivities = await this.findAllActivities(userId);
    const currentWeek = this.buildCurrentWeekSummary(weekWindow, weekActivities);
    const streak = this.buildStreakSummary(allActivities);
    const activityTotals = this.calculateActivityTotals(allActivities);
    const totals = {
      completedReadings: progressStats.completedReadings,
      readMinutes: Math.max(activityTotals.readMinutes, progressStats.readMinutes),
    };
    const goal = this.buildGoalSummary({
      weeklyTarget,
      completed: currentWeek.completedReadings,
    });
    const feedback = this.buildFeedback({
      weeklyTarget,
      completedReadings: currentWeek.completedReadings,
      readMinutes: currentWeek.readMinutes,
      activeDays: currentWeek.activeDays,
      streakDays: streak.currentDays,
    });
    const currentReading =
      progress.find((item) => item.status === ReadingProgressStatus.IN_PROGRESS) ??
      null;
    const lastReading = currentReading
      ? progress.find((item) => item.id !== currentReading.id) ?? null
      : progress[0] ?? null;
    const completedInLast7Days = currentWeek.completedReadings;
    const totalInProgress = progress.filter(
      (item) => item.status === ReadingProgressStatus.IN_PROGRESS,
    ).length;
    const totalCompleted = progressStats.completedReadings;
    const continueBlock = await this.buildContinueBlock(progress);
    const journeyBlock = await this.buildJourneyBlock({
      progress,
      continueBlock,
      currentWeek,
    });

    return {
      totals,
      currentWeek,
      streak,
      goal,
      feedback,
      journeyBlock,
      continueBlock,
      currentReading: currentReading ?this.mapProgress(currentReading) : null,
      lastReading: lastReading ?this.mapProgress(lastReading) : null,
      completedInLast7Days,
      totalInProgress,
      totalCompleted,
      panorama: {
        totalInProgress,
        totalCompleted,
      },
    };
  }

  async updateGoal(input: UpdateReadingGoalInput) {
    const weeklyTarget = this.normalizeWeeklyTarget(input.weeklyTarget);

    await this.prisma.user.update({
      where: {
        id: input.userId,
      },
      data: {
        weeklyReadingTarget: weeklyTarget,
      },
    });

    return this.getSummary(input.userId);
  }

  async upsertProgress(input: UpsertReadingProgressInput) {
    if (!input.contentType) {
      throw new BadRequestException('Tipo de leitura inválido.');
    }

    const requestedProgress = this.normalizeProgress(
      input.completed ?100 : input.progressPercent,
    );
    const target = await this.resolveContent({
      contentType: input.contentType,
      contentId: input.contentId,
      slug: input.slug,
    });
    const lastReadAt = new Date();
    const activityDate = this.toDateOnly(this.getLocalDateKey(lastReadAt));
    const progress = await this.prisma.$transaction(async (tx) => {
      const currentProgress =
        input.contentType === 'ARTICLE'
          ?await tx.readingProgress.findUnique({
              where: {
                userId_articleId: {
                  userId: input.userId,
                  articleId: target.id,
                },
              },
              select: {
                progressPercent: true,
                status: true,
                completedAt: true,
              },
            })
          : await tx.readingProgress.findUnique({
              where: {
                userId_shortEditionId: {
                  userId: input.userId,
                  shortEditionId: target.id,
                },
              },
              select: {
                progressPercent: true,
                status: true,
                completedAt: true,
              },
            });

      const previousProgress = currentProgress?.progressPercent ?? 0;
      const normalizedProgress = Math.max(requestedProgress, previousProgress);
      const state = this.buildProgressState(normalizedProgress);
      const completedAt =
        state.status === ReadingProgressStatus.COMPLETED
          ? currentProgress?.completedAt ?? state.completedAt
          : null;
      const shouldRecordActivity = normalizedProgress > 0;
      const minutesDelta = shouldRecordActivity
        ?this.calculateMinutesDelta({
            readTimeMinutes: target.readTimeMinutes,
            previousProgress,
            nextProgress: normalizedProgress,
          })
        : 0;
      const completedDelta =
        shouldRecordActivity &&
        state.status === ReadingProgressStatus.COMPLETED &&
        currentProgress?.status !== ReadingProgressStatus.COMPLETED
          ? 1
          : 0;

      const savedProgress =
        input.contentType === 'ARTICLE'
          ?await tx.readingProgress.upsert({
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
                completedAt,
              },
              update: {
                progressPercent: state.progressPercent,
                status: state.status,
                lastReadAt,
                completedAt,
              },
              include: {
                article: {
                  select: this.contentSelect,
                },
                shortEdition: {
                  select: this.contentSelect,
                },
              },
            })
          : await tx.readingProgress.upsert({
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
                completedAt,
              },
              update: {
                progressPercent: state.progressPercent,
                status: state.status,
                lastReadAt,
                completedAt,
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

      if (shouldRecordActivity) {
        await this.upsertDailyActivity(tx, {
          userId: input.userId,
          activityDate,
          minutesDelta,
          completedDelta,
        });
      }

      return savedProgress;
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

  private async getWeeklyTarget(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        weeklyReadingTarget: true,
      },
    });

    return this.normalizeWeeklyTarget(
      user?.weeklyReadingTarget ?? DEFAULT_WEEKLY_TARGET,
    );
  }

  private async findActivitiesInRange(input: {
    userId: string;
    startDateKey: string;
    endDateKey: string;
  }): Promise<DailyActivityPayload[]> {
    return this.prisma.dailyReadingActivity.findMany({
      where: {
        userId: input.userId,
        activityDate: {
          gte: this.toDateOnly(input.startDateKey),
          lte: this.toDateOnly(input.endDateKey),
        },
      },
      orderBy: {
        activityDate: 'asc',
      },
      select: {
        activityDate: true,
        minutesRead: true,
        completedCount: true,
      },
    });
  }

  private async findAllActivities(userId: string): Promise<DailyActivityPayload[]> {
    return this.prisma.dailyReadingActivity.findMany({
      where: {
        userId,
      },
      orderBy: {
        activityDate: 'desc',
      },
      select: {
        activityDate: true,
        minutesRead: true,
        completedCount: true,
      },
    });
  }

  private buildCurrentWeekSummary(
    weekWindow: ReturnType<ReadingProgressService['getCurrentWeekWindow']>,
    activities: DailyActivityPayload[],
  ) {
    const activityByDate = new Map(
      activities.map((activity) => [
        this.toDateKey(activity.activityDate),
        activity,
      ]),
    );
    const days = WEEKDAY_KEYS.map((key, index) => {
      const dateKey = this.addDays(weekWindow.startDateKey, index);
      return {
        key,
        active: activityByDate.has(dateKey),
      };
    });

    return {
      days,
      activeDays: days.filter((day) => day.active).length,
      completedReadings: activities.reduce(
        (sum, activity) => sum + activity.completedCount,
        0,
      ),
      readMinutes: activities.reduce(
        (sum, activity) => sum + activity.minutesRead,
        0,
      ),
    };
  }

  private buildStreakSummary(activities: DailyActivityPayload[]) {
    const activeDates = Array.from(
      new Set(activities.map((activity) => this.toDateKey(activity.activityDate))),
    ).sort((left, right) => right.localeCompare(left));
    const lastActiveDate = activeDates[0] ?? null;

    if (!lastActiveDate) {
      return {
        currentDays: 0,
        lastActiveDate,
      };
    }

    const activeDateSet = new Set(activeDates);
    const todayKey = this.getLocalDateKey(new Date());
    const yesterdayKey = this.addDays(todayKey, -1);
    const anchorDate = activeDateSet.has(todayKey)
      ?todayKey
      : activeDateSet.has(yesterdayKey)
        ?yesterdayKey
        : null;

    if (!anchorDate) {
      return {
        currentDays: 0,
        lastActiveDate,
      };
    }

    let currentDays = 0;
    let cursor = anchorDate;

    while (activeDateSet.has(cursor)) {
      currentDays += 1;
      cursor = this.addDays(cursor, -1);
    }

    return {
      currentDays,
      lastActiveDate,
    };
  }

  private calculateActivityTotals(activities: DailyActivityPayload[]) {
    return {
      readMinutes: activities.reduce(
        (sum, activity) => sum + activity.minutesRead,
        0,
      ),
      completedReadings: activities.reduce(
        (sum, activity) => sum + activity.completedCount,
        0,
      ),
    };
  }

  private calculateProgressStats(progress: ReadingProgressRecord[]) {
    return {
      completedReadings: progress.filter(
        (item) => item.status === ReadingProgressStatus.COMPLETED,
      ).length,
      readMinutes: progress.reduce((sum, item) => {
        const content = item.article ?? item.shortEdition;
        const readTimeMinutes = content?.readTimeMinutes ?? 0;
        return sum + Math.round((readTimeMinutes * item.progressPercent) / 100);
      }, 0),
    };
  }

  private buildGoalSummary(input: {
    weeklyTarget: number;
    completed: number;
  }) {
    const weeklyTarget = this.normalizeWeeklyTarget(input.weeklyTarget);
    const completed = Math.max(0, Math.round(input.completed));

    return {
      weeklyTarget,
      completed,
      percent: Math.round((completed / weeklyTarget) * 100),
    };
  }

  private buildFeedback(input: {
    weeklyTarget: number;
    completedReadings: number;
    readMinutes: number;
    activeDays: number;
    streakDays: number;
  }) {
    const halfGoal = Math.ceil(input.weeklyTarget / 2);

    if (
      input.completedReadings >= input.weeklyTarget ||
      input.activeDays >= 4 ||
      input.streakDays >= 5 ||
      input.readMinutes >= 45
    ) {
      return {
        level: 'positive' as const,
        title: 'ritmo editorial muito consistente',
        message:
          'sua rotina de leitura está sustentando presença e continuidade. mantenha esse compasso sem precisar acelerar além do necessário.',
      };
    }

    if (
      input.completedReadings >= halfGoal ||
      input.activeDays >= 2 ||
      input.streakDays >= 2 ||
      input.readMinutes >= 15
    ) {
      return {
        level: 'neutral' as const,
        title: 'boa base para continuar',
        message:
          'você já movimentou a semana. escolha uma próxima leitura curta para transformar esse começo em consistência.',
      };
    }

    return {
      level: 'attention' as const,
      title: 'retome o fio da semana',
      message:
        'sua meta ainda está com pouco avanço. uma leitura breve hoje já reativa a sequência e recoloca a rotina em movimento.',
    };
  }

  private async upsertDailyActivity(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      activityDate: Date;
      minutesDelta: number;
      completedDelta: number;
    },
  ) {
    await tx.dailyReadingActivity.upsert({
      where: {
        userId_activityDate: {
          userId: input.userId,
          activityDate: input.activityDate,
        },
      },
      create: {
        userId: input.userId,
        activityDate: input.activityDate,
        minutesRead: input.minutesDelta,
        completedCount: input.completedDelta,
      },
      update: {
        minutesRead: {
          increment: input.minutesDelta,
        },
        completedCount: {
          increment: input.completedDelta,
        },
      },
    });
  }

  private calculateMinutesDelta(input: {
    readTimeMinutes: number;
    previousProgress: number;
    nextProgress: number;
  }) {
    const deltaPercent = Math.max(
      0,
      Math.min(input.nextProgress, 100) - Math.min(input.previousProgress, 100),
    );

    if (deltaPercent <= 0) {
      return 0;
    }

    return Math.max(
      1,
      Math.round((Math.max(0, input.readTimeMinutes) * deltaPercent) / 100),
    );
  }

  private normalizeWeeklyTarget(value: number) {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('weeklyTarget precisa ser numérico.');
    }

    const normalized = Math.round(value);

    if (normalized < 1 || normalized > MAX_WEEKLY_TARGET) {
      throw new BadRequestException(
        `weeklyTarget deve estar entre 1 e ${MAX_WEEKLY_TARGET}.`,
      );
    }

    return normalized;
  }

  private getCurrentWeekWindow() {
    const todayKey = this.getLocalDateKey(new Date());
    const weekSlot = this.getWeekdaySlot(todayKey);
    const startDateKey = this.addDays(todayKey, -weekSlot);
    const endDateKey = this.addDays(startDateKey, 6);

    return {
      todayKey,
      startDateKey,
      endDateKey,
    };
  }

  private getLocalDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: LOCAL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const values = new Map(parts.map((part) => [part.type, part.value]));

    return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
  }

  private toDateOnly(dateKey: string) {
    return new Date(`${dateKey}T00:00:00.000Z`);
  }

  private toDateKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private addDays(dateKey: string, amount: number) {
    const date = this.toDateOnly(dateKey);
    date.setUTCDate(date.getUTCDate() + amount);
    return this.toDateKey(date);
  }

  private getWeekdaySlot(dateKey: string) {
    return (this.toDateOnly(dateKey).getUTCDay() + 6) % 7;
  }

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
      ctaLabel: isFallbackRevision ?'revisitar leitura' : 'começar nova leitura',
    };
  }

  private async buildJourneyBlock(input: {
    progress: ReadingProgressRecord[];
    continueBlock: Awaited<ReturnType<ReadingProgressService['buildContinueBlock']>>;
    currentWeek: {
      activeDays: number;
      completedReadings: number;
      readMinutes: number;
    };
  }) {
    const { progress, continueBlock, currentWeek } = input;
    const publishedArticles = await this.findPublishedArticles();
    const articleProgress = progress.filter((item) => Boolean(item.article));
    const articleProgressById = new Map(
      articleProgress
        .filter((item) => item.articleId)
        .map((item) => [item.articleId as string, item]),
    );
    const articleJourneyPercent = publishedArticles.length
      ?Math.round(
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

    return {
      mode,
      headline: isContinuing
        ?'você está construindo consistência.'
        : 'sua próxima leitura já está pronta.',
      supportText: isContinuing
        ?'continue avançando um pouco a cada dia. pequenos passos geram grandes mudanças.'
        : 'sem uma leitura em andamento agora, esta é a próxima sugestão editorial para continuar sua linha de raciocínio.',
      ctaLabel: isContinuing
        ?'continuar leitura'
        : isRevision
          ?'revisitar leitura'
          : 'começar nova leitura',
      journeyPercent,
      readingDaysThisWeek: currentWeek.activeDays,
      dedicatedMinutesThisWeek: currentWeek.readMinutes,
      completedThisWeek: currentWeek.completedReadings,
      item,
      nextStepText: isContinuing
        ?'voltar ao trecho em que clareza e respeito deixam de competir na conversa.'
        : isRevision
          ?'revisitar o acervo concluído com um olhar novo e recuperar um ponto útil.'
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
            ?{
                not: null,
              }
            : undefined,
        shortEditionId:
          input.contentType === 'SHORT_EDITION'
            ?{
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

  private async resolveContent(input: {
    contentType: ReadingProgressContentType;
    contentId?: string;
    slug?: string;
  }) {
    const { contentType, contentId, slug } = input;
    const contentWhere = contentId
      ?{ id: contentId, isPublished: true }
      : slug
        ?{ slug, isPublished: true }
        : null;

    if (!contentWhere) {
      throw new BadRequestException('Informe contentId ou slug para registrar progresso.');
    }

    if (contentType === 'ARTICLE') {
      const article = await this.prisma.article.findFirst({
        where: contentWhere,
        select: {
          id: true,
          readTimeMinutes: true,
        },
      });

      if (!article) {
        throw new NotFoundException('Artigo não encontrado.');
      }

      return article;
    }

    const shortEdition = await this.prisma.shortEdition.findFirst({
      where: contentWhere,
      select: {
        id: true,
        readTimeMinutes: true,
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
      ?'ARTICLE'
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
