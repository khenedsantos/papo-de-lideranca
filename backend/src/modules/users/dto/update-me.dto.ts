import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ?value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ?value.trim().toLowerCase() : value))
  @IsString()
  @MaxLength(120)
  email?: string;
}
