import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NatsService } from '../../../shared/nats.service';
import { StructuredLogger, LogMethod } from '../../../shared/logger';
import { Event, FacebookEvent, TiktokEvent } from '../../../shared/types';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class EventCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('EventCollectorService');
  private readonly collectorType: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {
    this.collectorType = process.env.COLLECTOR_TYPE || 'unknown';
  }

  async onModuleInit() {
    try {
      await this.natsService.createStream('marketing-events', [
        'events.facebook.top',
        'events.facebook.bottom',
        'events.tiktok.top',
        'events.tiktok.bottom',
      ]);

      if (this.collectorType === 'facebook') {
        await this.subscribeToFacebookEvents();
      } else if (this.collectorType === 'tiktok') {
        await this.subscribeToTiktokEvents();
      } else {
        this.logger.warn(`Unknown collector type: ${this.collectorType}`);
      }

      this.logger.log(`Event collector initialized for ${this.collectorType}`);
    } catch (error) {
      this.logger.error('Failed to initialize event collector', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Event collector service shutting down');
  }

  private async subscribeToFacebookEvents() {
    await this.natsService.subscribeToStream(
      'marketing-events',
      'events.facebook.top',
      async (data) => {
        await this.processFacebookEvent(data, 'top');
      }
    );

    await this.natsService.subscribeToStream(
      'marketing-events',
      'events.facebook.bottom',
      async (data) => {
        await this.processFacebookEvent(data, 'bottom');
      }
    );
  }

  private async subscribeToTiktokEvents() {
    await this.natsService.subscribeToStream(
      'marketing-events',
      'events.tiktok.top',
      async (data) => {
        await this.processTiktokEvent(data, 'top');
      }
    );

    await this.natsService.subscribeToStream(
      'marketing-events',
      'events.tiktok.bottom',
      async (data) => {
        await this.processTiktokEvent(data, 'bottom');
      }
    );
  }

  @LogMethod()
  private async processFacebookEvent(data: any, funnelStage: string) {
    const startTime = Date.now();
    
    try {
      const event = data as FacebookEvent;
      
      this.metricsService.recordMetric('accepted', 1, {
        source: 'facebook',
        eventType: event.eventType,
        funnelStage,
        correlationId: data.correlationId,
      });

      await this.prisma.event.create({
        data: {
          eventId: event.eventId,
          timestamp: new Date(event.timestamp),
          source: event.source,
          funnelStage: event.funnelStage,
          eventType: event.eventType,
          userId: event.data.user.userId,
          userName: event.data.user.name,
          userAge: event.data.user.age,
          userGender: event.data.user.gender,
          userCountry: event.data.user.location.country,
          userCity: event.data.user.location.city,
          userData: JSON.parse(JSON.stringify(event.data.user)),
          engagementData: JSON.parse(JSON.stringify(event.data.engagement)),
        },
      });

      this.metricsService.recordMetric('processed', 1, {
        source: 'facebook',
        eventType: event.eventType,
        funnelStage,
        correlationId: data.correlationId,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`Facebook event processed successfully`, {
        eventId: event.eventId,
        eventType: event.eventType,
        funnelStage,
        duration: `${duration}ms`,
        correlationId: data.correlationId,
      });

    } catch (error) {
      this.metricsService.recordMetric('failed', 1, {
        source: 'facebook',
        eventType: data?.eventType || 'unknown',
        error: error.message,
        correlationId: data.correlationId,
      });

      this.logger.error(`Failed to process Facebook event`, error.stack, {
        eventId: data?.eventId,
        correlationId: data.correlationId,
      });
    }
  }

  @LogMethod()
  private async processTiktokEvent(data: any, funnelStage: string) {
    const startTime = Date.now();
    
    try {
      const event = data as TiktokEvent;
      
      this.metricsService.recordMetric('accepted', 1, {
        source: 'tiktok',
        eventType: event.eventType,
        funnelStage,
        correlationId: data.correlationId,
      });

      await this.prisma.event.create({
        data: {
          eventId: event.eventId,
          timestamp: new Date(event.timestamp),
          source: event.source,
          funnelStage: event.funnelStage,
          eventType: event.eventType,
          userId: event.data.user.userId,
          userName: event.data.user.username,
          userFollowers: event.data.user.followers,
          userData: JSON.parse(JSON.stringify(event.data.user)),
          engagementData: JSON.parse(JSON.stringify(event.data.engagement)),
        },
      });

      this.metricsService.recordMetric('processed', 1, {
        source: 'tiktok',
        eventType: event.eventType,
        funnelStage,
        correlationId: data.correlationId,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`TikTok event processed successfully`, {
        eventId: event.eventId,
        eventType: event.eventType,
        funnelStage,
        duration: `${duration}ms`,
        correlationId: data.correlationId,
      });

    } catch (error) {
      this.metricsService.recordMetric('failed', 1, {
        source: 'tiktok',
        eventType: data?.eventType || 'unknown',
        error: error.message,
        correlationId: data.correlationId,
      });

      this.logger.error(`Failed to process TikTok event`, error.stack, {
        eventId: data?.eventId,
        correlationId: data.correlationId,
      });
    }
  }
}

