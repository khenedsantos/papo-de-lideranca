import { Controller, Get, Param } from '@nestjs/common';
import { ShortEditionsService } from './short-editions.service';

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

