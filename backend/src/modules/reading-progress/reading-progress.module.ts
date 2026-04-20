import { Module } from '@nestjs/common';
import { ReadingProgressService } from './reading-progress.service';

@Module({
  providers: [ReadingProgressService],
  exports: [ReadingProgressService],
})
export class ReadingProgressModule {}

