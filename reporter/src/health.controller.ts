import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      () => ({
        app: {
          status: 'up',
          timestamp: new Date().toISOString(),
        },
      }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  async checkReadiness() {
    return this.health.check([
      () => ({
        app: {
          status: 'up',
          timestamp: new Date().toISOString(),
        },
      }),
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return {
            database: {
              status: 'up',
              timestamp: new Date().toISOString(),
            },
          };
        } catch (error) {
          return {
            database: {
              status: 'down',
              error: error.message,
              timestamp: new Date().toISOString(),
            },
          };
        }
      },
    ]);
  }
}

