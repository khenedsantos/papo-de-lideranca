import { Module } from '@nestjs/common';
import { ShortEditionsController } from './short-editions.controller';
import { ShortEditionsService } from './short-editions.service';

@Module({
  controllers: [ShortEditionsController],
  providers: [ShortEditionsService],
})
export class ShortEditionsModule {}

