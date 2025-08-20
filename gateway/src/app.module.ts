import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookController } from './webhook.controller';
import { HealthController } from './health.controller';
import { MetricsService } from './services/metrics.service';
import { NatsService } from '@shared/nats.service';
import { StructuredLogger } from '@shared/logger';
import { WebhookService } from './services/webhook.service';
import { ValidationService } from './services/validation.service';
import { MessagingRepository } from './repositories/messaging.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TerminusModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [WebhookController, HealthController],
  providers: [
    {
      provide: NatsService,
      useFactory: () => {
        return new NatsService({
          url: process.env.NATS_URL || 'nats://localhost:4222',
          name: process.env.NATS_NAME || 'gateway',
          maxReconnectAttempts: parseInt(process.env.NATS_MAX_RECONNECT_ATTEMPTS || '10'),
          reconnectTimeWait: parseInt(process.env.NATS_RECONNECT_TIME_WAIT || '1000'),
        });
      },
    },
    MetricsService,
    StructuredLogger,
    WebhookService,
    ValidationService,
    MessagingRepository,
  ],
})
export class AppModule {}

