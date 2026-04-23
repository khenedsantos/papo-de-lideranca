import { ReadingProgressStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import {
  READING_PROGRESS_CONTENT_TYPES,
  type ReadingProgressContentType,
} from '../reading-progress.service';

export class ListReadingProgressQueryDto {
  @IsOptional()
  @IsIn(READING_PROGRESS_CONTENT_TYPES)
  contentType?: ReadingProgressContentType;

  @IsOptional()
  @IsEnum(ReadingProgressStatus)
  status?: ReadingProgressStatus;
}
