import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

interface AvatarUploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const AVATAR_MAX_SIZE = 3 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('account-summary')
  accountSummary(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAccountSummary(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.usersService.findMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() updateMeDto: UpdateMeDto) {
    return this.usersService.updateMe(user.sub, updateMeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: AVATAR_MAX_SIZE,
      },
      fileFilter: (
        _request: unknown,
        file: AvatarUploadFile,
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('Envie uma imagem em JPG, PNG ou WEBP.'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  updateAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: AvatarUploadFile | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Selecione uma imagem para atualizar sua foto.');
    }

    return this.usersService.updateAvatar(user.sub, file);
  }
}
