import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { BookLevel } from '@prisma/client';

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  return value.toLowerCase() === 'true';
}

export class ListBooksQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  category?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsEnum(BookLevel)
  level?: BookLevel;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeBoolean(value))
  @IsBoolean()
  featured?: boolean;
}
