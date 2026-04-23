import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import {
  READING_PROGRESS_CONTENT_TYPES,
  type ReadingProgressContentType,
} from '../reading-progress.service';

export class UpsertReadingProgressDto {
  @IsIn(READING_PROGRESS_CONTENT_TYPES)
  contentType!: ReadingProgressContentType;

  @IsString()
  contentId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent!: number;
}
