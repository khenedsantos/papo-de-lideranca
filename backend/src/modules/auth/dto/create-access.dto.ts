import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAccessDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  confirmPassword!: string;
}
