import { Injectable } from '@nestjs/common';
import { Event, FacebookEvent, TiktokEvent } from '@shared/types';
import { StructuredLogger, LogMethod } from '@shared/logger';
import { EventRepository } from '../repositories/event.repository';
import { MetricsService } from './metrics.service';

@Injectable()
export class EventProcessingService {
  private readonly logger = new StructuredLogger('EventProcessingService');

  constructor(
    private readonly eventRepository: EventRepository,
    private readonly metricsService: MetricsService,
  ) {}

  @LogMethod()
  async processEvent(event: Event, correlationId?: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log('Processing event', {
        correlationId,
        eventId: event.eventId,
        source: event.source,
        eventType: event.eventType,
        funnelStage: event.funnelStage,
      });

      this.metricsService.recordMetric('accepted', 1, {
        collector_type: process.env.COLLECTOR_TYPE || 'unknown',
        source: event.source,
        event_type: event.eventType,
        funnel_stage: event.funnelStage,
      });

      await this.eventRepository.saveEvent(event, correlationId);

      this.metricsService.recordMetric('processed', 1, {
        collector_type: process.env.COLLECTOR_TYPE || 'unknown',
        source: event.source,
        event_type: event.eventType,
        funnel_stage: event.funnelStage,
      });

      const duration = Date.now() - startTime;
      this.metricsService.recordProcessingDuration(duration, {
        collector_type: process.env.COLLECTOR_TYPE || 'unknown',
        source: event.source,
        event_type: event.eventType,
      });

      this.logger.log('Event processed successfully', {
        correlationId,
        eventId: event.eventId,
        source: event.source,
        duration: `${duration}ms`,
      });

    } catch (error) {
      this.metricsService.recordMetric('failed', 1, {
        collector_type: process.env.COLLECTOR_TYPE || 'unknown',
        source: event.source,
        event_type: event.eventType,
        error: error.message,
      });

      this.logger.error('Failed to process event', error.stack, {
        correlationId,
        eventId: event.eventId,
        source: event.source,
        error: error.message,
      });

      throw error;
    }
  }

  @LogMethod()
  async processFacebookEvent(event: FacebookEvent, correlationId?: string): Promise<void> {
    await this.processEvent(event, correlationId);
  }

  @LogMethod()
  async processTiktokEvent(event: TiktokEvent, correlationId?: string): Promise<void> {
    await this.processEvent(event, correlationId);
  }
}
