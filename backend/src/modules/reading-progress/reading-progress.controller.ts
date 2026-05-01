import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReadingProgressStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ListReadingProgressQueryDto } from './dto/list-reading-progress-query.dto';
import { UpdateReadingGoalDto } from './dto/update-reading-goal.dto';
import { UpsertReadingProgressDto } from './dto/upsert-reading-progress.dto';
import { ReadingProgressService } from './reading-progress.service';

@UseGuards(JwtAuthGuard)
@Controller('reading-progress')
export class ReadingProgressController {
  constructor(
    private readonly readingProgressService: ReadingProgressService,
  ) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.readingProgressService.getSummary(user.sub);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListReadingProgressQueryDto,
  ) {
    return this.readingProgressService.listProgress({
      userId: user.sub,
      contentType: query.contentType,
      status: query.status as ReadingProgressStatus | undefined,
    });
  }

  @Post()
  upsert(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpsertReadingProgressDto,
  ) {
    return this.readingProgressService.upsertProgress({
      userId: user.sub,
      contentType: body.contentType ?? body.itemType!,
      contentId: body.contentId,
      slug: body.slug,
      progressPercent: body.progressPercent,
      completed: body.completed,
    });
  }

  @Patch('goal')
  updateGoal(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateReadingGoalDto,
  ) {
    return this.readingProgressService.updateGoal({
      userId: user.sub,
      weeklyTarget: body.weeklyTarget,
    });
  }
}
