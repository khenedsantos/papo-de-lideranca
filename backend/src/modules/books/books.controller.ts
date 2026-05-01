import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { BooksService } from './books.service';
import { CreateBookNoteDto } from './dto/create-book-note.dto';
import { ListBookNotesQueryDto } from './dto/list-book-notes-query.dto';
import { ListBooksQueryDto } from './dto/list-books-query.dto';
import { ModerateBookNoteDto } from './dto/moderate-book-note.dto';

@UseGuards(JwtAuthGuard)
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListBooksQueryDto,
  ) {
    return this.booksService.list(user.sub, query);
  }

  @Get(':slug')
  findBySlug(
    @CurrentUser() user: JwtPayload,
    @Param('slug') slug: string,
  ) {
    return this.booksService.findBySlug(user.sub, slug);
  }

  @Get(':slug/notes')
  listNotes(
    @CurrentUser() user: JwtPayload,
    @Param('slug') slug: string,
    @Query() query: ListBookNotesQueryDto,
  ) {
    return this.booksService.listNotes(user.sub, slug, query);
  }

  @Post(':slug/notes')
  upsertNote(
    @CurrentUser() user: JwtPayload,
    @Param('slug') slug: string,
    @Body() body: CreateBookNoteDto,
  ) {
    return this.booksService.upsertNote(user.sub, slug, body);
  }

  @Patch('notes/:id/moderate')
  moderateNote(
    @CurrentUser() user: JwtPayload,
    @Param('id') noteId: string,
    @Body() body: ModerateBookNoteDto,
  ) {
    return this.booksService.moderateNote(user.role, noteId, body);
  }
}
