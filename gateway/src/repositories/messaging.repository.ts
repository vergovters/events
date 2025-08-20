import { Injectable } from '@nestjs/common';
import { Event } from '@shared/types';
import { StructuredLogger, LogMethod } from '@shared/logger';
import { NatsService } from '@shared/nats.service';

@Injectable()
export class MessagingRepository {
  private readonly logger = new StructuredLogger('MessagingRepository');

  constructor(private readonly natsService: NatsService) {}

  @LogMethod()
  async publishEvent(event: Event, correlationId?: string): Promise<void> {
    try {
      const subject = this.buildSubject(event);
      
      this.logger.log('Publishing event to NATS stream', {
        correlationId,
        eventId: event.eventId,
        subject,
        source: event.source,
        eventType: event.eventType,
      });

      await this.natsService.publishToStream(
        'marketing-events',
        subject,
        {
          ...event,
          correlationId: correlationId || this.generateCorrelationId(),
          receivedAt: new Date().toISOString(),
        }
      );

      this.logger.log('Event published to stream successfully', {
        correlationId,
        eventId: event.eventId,
        subject,
      });
    } catch (error) {
      this.logger.error('Failed to publish event to stream', error.stack, {
        correlationId,
        eventId: event.eventId,
        error: error.message,
      });
      
      throw error;
    }
  }

  private buildSubject(event: Event): string {
    return `events.${event.source}.${event.funnelStage}`;
  }

  private generateCorrelationId(): string {
    return `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async checkConnection(): Promise<boolean> {
    try {
      return this.natsService.isConnected();
    } catch (error) {
      this.logger.error('Failed to check NATS connection', error.stack);
      return false;
    }
  }
}
