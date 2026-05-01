import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { BookNoteStatus } from '@prisma/client';

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  return value.toLowerCase() === 'true';
}

export class ModerateBookNoteDto {
  @IsEnum(BookNoteStatus)
  status!: BookNoteStatus;

  @IsOptional()
  @Transform(({ value }) => normalizeBoolean(value))
  @IsBoolean()
  isHighlighted?: boolean;
}
