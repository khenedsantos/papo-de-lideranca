import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, Max, Min } from 'class-validator';

function normalizeBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  return value.toLowerCase() === 'true';
}

export class ListBookNotesQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeBoolean(value))
  @IsBoolean()
  highlighted?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(24)
  limit?: number;
}
