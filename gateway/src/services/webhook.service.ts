import { Injectable } from '@nestjs/common';
import { StructuredLogger, LogMethod } from '@shared/logger';
import { MessagingRepository } from '../repositories/messaging.repository';
import { ValidationService } from './validation.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class WebhookService {
  private readonly logger = new StructuredLogger('WebhookService');

  constructor(
    private readonly messagingRepository: MessagingRepository,
    private readonly validationService: ValidationService,
    private readonly metricsService: MetricsService,
  ) {}

  @LogMethod()
  async processEvent(eventData: any, correlationId?: string): Promise<{ success: boolean; eventId?: string }> {
    const startTime = Date.now();
    
    try {
      const event = this.validationService.validateEvent(eventData);
      
      this.metricsService.recordMetric('accepted', 1, {
        source: event.source,
        event_type: event.eventType,
        funnel_stage: event.funnelStage,
      });

      await this.messagingRepository.publishEvent(event, correlationId);
      
      this.metricsService.recordMetric('processed', 1, {
        source: event.source,
        event_type: event.eventType,
        funnel_stage: event.funnelStage,
      });

      const duration = Date.now() - startTime;
      this.metricsService.recordProcessingDuration(duration, {
        source: event.source,
        event_type: event.eventType,
      });

      this.logger.log('Event processed successfully', {
        correlationId,
        eventId: event.eventId,
        source: event.source,
        eventType: event.eventType,
      });

      return { success: true, eventId: event.eventId };
    } catch (error) {       
      this.metricsService.recordMetric('failed', 1, {
        source: eventData?.source || 'unknown',
        event_type: eventData?.eventType || 'unknown',
        error: error.message,
      });

      this.logger.error('Failed to process event', error.stack, {
        correlationId,
        error: error.message,
      });

      throw error;
    }
  }
}
