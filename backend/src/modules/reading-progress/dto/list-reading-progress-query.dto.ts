import { Transform } from 'class-transformer';
import { ReadingProgressStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import {
  READING_PROGRESS_CONTENT_TYPES,
  normalizeReadingProgressContentType,
  type ReadingProgressContentType,
} from '../reading-progress.service';

export class ListReadingProgressQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeReadingProgressContentType(value))
  @IsIn(READING_PROGRESS_CONTENT_TYPES)
  contentType?: ReadingProgressContentType;

  @IsOptional()
  @IsEnum(ReadingProgressStatus)
  status?: ReadingProgressStatus;
}
