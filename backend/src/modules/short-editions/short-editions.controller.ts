import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShortEditionsService } from './short-editions.service';

@UseGuards(JwtAuthGuard)
@Controller('short-editions')
export class ShortEditionsController {
  constructor(private readonly shortEditionsService: ShortEditionsService) {}

  @Get()
  list() {
    return this.shortEditionsService.list();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.shortEditionsService.findBySlug(slug);
  }
}
