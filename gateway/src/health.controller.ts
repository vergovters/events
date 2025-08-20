import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { NatsService } from '@shared/nats.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly natsService: NatsService,
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
      () => ({
        nats: {
          status: this.natsService.isConnected() ? 'up' : 'down',
          timestamp: new Date().toISOString(),
        },
      }),
    ]);
  }
}

