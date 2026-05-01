import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookLevel, BookNoteStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateBookNoteDto } from './dto/create-book-note.dto';
import { ListBookNotesQueryDto } from './dto/list-book-notes-query.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { ModerateBookNoteDto } from './dto/moderate-book-note.dto';

const COMMUNITY_NOTES_LIMIT = 12;

type BookListRecord = Prisma.BookGetPayload<{
  select: typeof bookListSelect;
}>;

type BookDetailRecord = Prisma.BookGetPayload<{
  select: typeof bookDetailSelect;
}>;

type BookNoteRecord = Prisma.BookNoteGetPayload<{
  select: typeof bookNoteSelect;
}>;

const bookListSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  author: true,
  description: true,
  coverUrl: true,
  coverAlt: true,
  category: true,
  level: true,
  readTime: true,
  whyRead: true,
  purchaseUrl: true,
  purchaseProvider: true,
  isFeatured: true,
  displayOrder: true,
  createdAt: true,
} satisfies Prisma.BookSelect;

const bookDetailSelect = {
  ...bookListSelect,
  whatYouWillLearn: true,
  keyIdeas: true,
  guidedQuestions: true,
  practicalUse: true,
  relatedArticleSlugs: true,
  relatedShortEditionSlugs: true,
  purchaseLabel: true,
  purchaseUrl: true,
  updatedAt: true,
} satisfies Prisma.BookSelect;

const bookNoteSelect = {
  id: true,
  promptKey: true,
  content: true,
  status: true,
  isHighlighted: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BookNoteSelect;

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListBooksQueryDto) {
    await this.assertActiveSubscriber(userId);

    const where: Prisma.BookWhereInput = {
      isActive: true,
    };

    if (query.category) {
      where.category = {
        equals: query.category,
        mode: 'insensitive',
      };
    }

    if (query.level) {
      where.level = query.level;
    }

    if (typeof query.featured === 'boolean') {
      where.isFeatured = query.featured;
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { subtitle: { contains: query.q, mode: 'insensitive' } },
        { author: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { whyRead: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const books = await this.prisma.book.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
        { title: 'asc' },
      ],
      select: bookListSelect,
    });

    return books.map((book) => this.serializeBookListItem(book));
  }

  async findBySlug(userId: string, slug: string) {
    await this.assertActiveSubscriber(userId);

    const book = await this.findActiveBook(slug);
    const [communityNotes, myNotes] = await Promise.all([
      this.prisma.bookNote.findMany({
        where: {
          bookId: book.id,
          status: BookNoteStatus.APPROVED,
        },
        orderBy: [
          { isHighlighted: 'desc' },
          { createdAt: 'desc' },
        ],
        take: COMMUNITY_NOTES_LIMIT,
        select: bookNoteSelect,
      }),
      this.prisma.bookNote.findMany({
        where: {
          bookId: book.id,
          userId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        select: bookNoteSelect,
      }),
    ]);

    return {
      book: this.serializeBookDetail(book),
      communityNotes: communityNotes.map((note) => this.serializeCommunityNote(note)),
      myNotes: myNotes.map((note) => this.serializeMyNote(note)),
    };
  }

  async listNotes(userId: string, slug: string, query: ListBookNotesQueryDto) {
    await this.assertActiveSubscriber(userId);

    const book = await this.findActiveBook(slug);
    const take = Math.min(Math.max(query.limit ?? COMMUNITY_NOTES_LIMIT, 1), 24);

    const notes = await this.prisma.bookNote.findMany({
      where: {
        bookId: book.id,
        status: BookNoteStatus.APPROVED,
        ...(typeof query.highlighted === 'boolean'
          ? { isHighlighted: query.highlighted }
          : {}),
      },
      orderBy: [
        { isHighlighted: 'desc' },
        { createdAt: 'desc' },
      ],
      take,
      select: bookNoteSelect,
    });

    return notes.map((note) => this.serializeCommunityNote(note));
  }

  async upsertNote(userId: string, slug: string, body: CreateBookNoteDto) {
    await this.assertActiveSubscriber(userId);

    const book = await this.findActiveBook(slug);
    const note = await this.prisma.bookNote.upsert({
      where: {
        userId_bookId_promptKey: {
          userId,
          bookId: book.id,
          promptKey: body.promptKey,
        },
      },
      update: {
        content: body.content,
        status: BookNoteStatus.PENDING,
        isHighlighted: false,
      },
      create: {
        userId,
        bookId: book.id,
        promptKey: body.promptKey,
        content: body.content,
        status: BookNoteStatus.PENDING,
      },
      select: bookNoteSelect,
    });

    return this.serializeMyNote(note);
  }

  async moderateNote(userRole: string, noteId: string, body: ModerateBookNoteDto) {
    this.assertAdmin(userRole);

    const note = await this.prisma.bookNote.findUnique({
      where: { id: noteId },
      select: { id: true },
    });

    if (!note) {
      throw new NotFoundException('Nota de leitura não encontrada.');
    }

    const isHighlighted = body.status === BookNoteStatus.APPROVED
      ? Boolean(body.isHighlighted)
      : false;

    const updated = await this.prisma.bookNote.update({
      where: { id: noteId },
      data: {
        status: body.status,
        isHighlighted,
      },
      select: bookNoteSelect,
    });

    return this.serializeMyNote(updated);
  }

  private async findActiveBook(slug: string) {
    const book = await this.prisma.book.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: bookDetailSelect,
    });

    if (!book) {
      throw new NotFoundException('Livro não encontrado na estante.');
    }

    return book;
  }

  private async assertActiveSubscriber(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        subscriptions: {
          where: {
            status: 'ACTIVE',
            plan: 'PREMIUM',
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !user.isActive || !user.subscriptions.length) {
      throw new ForbiddenException('Esta estante é exclusiva para assinantes ativos.');
    }
  }

  private assertAdmin(userRole: string) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem moderar notas.');
    }
  }

  private serializeBookListItem(book: BookListRecord) {
    return {
      id: book.id,
      slug: book.slug,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author,
      description: book.description,
      coverUrl: book.coverUrl,
      coverAlt: book.coverAlt,
      category: book.category,
      level: book.level,
      readTime: book.readTime,
      whyRead: book.whyRead,
      purchaseProvider: book.purchaseProvider,
      isFeatured: book.isFeatured,
      displayOrder: book.displayOrder,
      createdAt: book.createdAt,
      hasPurchaseUrl: Boolean(book.purchaseUrl),
    };
  }

  private serializeBookDetail(book: BookDetailRecord) {
    return {
      ...book,
      whatYouWillLearn: this.jsonArray(book.whatYouWillLearn),
      keyIdeas: this.jsonArray(book.keyIdeas),
      guidedQuestions: this.jsonArray(book.guidedQuestions),
      relatedArticleSlugs: this.stringArray(book.relatedArticleSlugs),
      relatedShortEditionSlugs: this.stringArray(book.relatedShortEditionSlugs),
      hasPurchaseUrl: Boolean(book.purchaseUrl),
    };
  }

  private serializeCommunityNote(note: BookNoteRecord) {
    return {
      id: note.id,
      promptKey: note.promptKey,
      content: note.content,
      isHighlighted: note.isHighlighted,
      createdAt: note.createdAt,
      authorLabel: 'assinante',
    };
  }

  private serializeMyNote(note: BookNoteRecord) {
    return {
      id: note.id,
      promptKey: note.promptKey,
      content: note.content,
      status: note.status,
      isHighlighted: note.isHighlighted,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  private jsonArray(value: Prisma.JsonValue | null | undefined) {
    return Array.isArray(value) ? value : [];
  }

  private stringArray(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }
}
