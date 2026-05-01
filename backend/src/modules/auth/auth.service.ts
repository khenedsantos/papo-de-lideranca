import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { CreateAccessDto } from './dto/create-access.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private ensurePasswordsMatch(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('As senhas não conferem.');
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(this.normalizeEmail(email));

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!user.hasCompletedAccess) {
      throw new ForbiddenException('Acesso ainda não foi criado para este usuário.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return user;
  }

  async createAccess({
    name,
    email,
    password,
    confirmPassword,
  }: CreateAccessDto) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.hasCompletedAccess) {
      throw new ConflictException('Este usuário já concluiu a criação de acesso.');
    }

    this.ensurePasswordsMatch(password, confirmPassword);

    const passwordHash = await bcrypt.hash(password, 10);

    await this.usersService.updateCredentials(user.id, {
      name,
      passwordHash,
      hasCompletedAccess: true,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    });

    return {
      message: 'Acesso criado com sucesso.',
    };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.validateUser(email, password);
    await this.usersService.updateLastLogin(user.id);

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);
    const message =
      'Se este e-mail estiver cadastrado, enviaremos as instruções de redefinição em instantes.';

    if (!user) {
      return {
        message,
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersService.saveResetToken(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpiresAt,
    });

    if (process.env.NODE_ENV === 'production') {
      return {
        message,
      };
    }

    return {
      message,
      resetToken,
    };
  }

  async resetPassword({
    token,
    password,
    confirmPassword,
  }: ResetPasswordDto) {
    this.ensurePasswordsMatch(password, confirmPassword);

    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Link de redefinição inválido.');
    }

    if (
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Link de redefinição expirado.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.usersService.updateCredentials(user.id, {
      passwordHash,
      hasCompletedAccess: true,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    });

    return {
      message: 'Senha atualizada com sucesso.',
    };
  }
}
