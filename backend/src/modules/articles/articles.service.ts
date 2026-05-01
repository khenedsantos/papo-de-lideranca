import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const ARTICLE_STATIC_PATH_PREFIX = './artigos';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const articles = await this.prisma.article.findMany({
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

    return articles.map((article) => this.mapArticle(article));
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
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

    if (!article) {
      throw new NotFoundException('Artigo não encontrado.');
    }

    return this.mapArticle(article);
  }

  private mapArticle<T extends { slug: string; excerpt?: string }>(article: T) {
    return {
      ...article,
      type: 'article' as const,
      summary: article.excerpt,
      staticPath: `${ARTICLE_STATIC_PATH_PREFIX}/${article.slug}.html`,
    };
  }
}
