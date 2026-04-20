import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    await this.prisma.$queryRawUnsafe('SELECT 1');

    return {
      status: 'ok',
      service: 'papo-de-lideranca-backend',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}

