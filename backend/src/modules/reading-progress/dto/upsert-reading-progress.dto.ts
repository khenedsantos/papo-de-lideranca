import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  READING_PROGRESS_CONTENT_TYPES,
  normalizeReadingProgressContentType,
  type ReadingProgressContentType,
} from '../reading-progress.service';

export class UpsertReadingProgressDto {
  @IsOptional()
  @Transform(({ value }) => normalizeReadingProgressContentType(value))
  @IsIn(READING_PROGRESS_CONTENT_TYPES)
  contentType?: ReadingProgressContentType;

  @IsOptional()
  @Transform(({ value }) => normalizeReadingProgressContentType(value))
  @IsIn(READING_PROGRESS_CONTENT_TYPES)
  itemType?: ReadingProgressContentType;

  @IsOptional()
  @IsString()
  contentId?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent!: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
