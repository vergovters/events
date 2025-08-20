import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StructuredLogger, LogMethod } from '@shared/logger';
import { Event, FacebookEvent, TiktokEvent } from '@shared/types';
import { MessagingRepository } from '../repositories/messaging.repository';
import { EventProcessingService } from './event-processing.service';

@Injectable()
export class CollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('CollectorService');
  private readonly collectorType: string;

  constructor(
    private readonly messagingRepository: MessagingRepository,
    private readonly eventProcessingService: EventProcessingService,
  ) {
    this.collectorType = process.env.COLLECTOR_TYPE || 'unknown';
  }

  async onModuleInit() {
    try {
      await this.messagingRepository.initializeStreams([
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

      this.logger.log(`Collector service initialized for ${this.collectorType}`);
    } catch (error) {
      this.logger.error('Failed to initialize collector service', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Collector service shutting down');
  }

  @LogMethod()
  private async subscribeToFacebookEvents(): Promise<void> {
    try {
      await this.messagingRepository.subscribe(
        'events.facebook.top',
        'facebook-collector-top',
        (event: FacebookEvent, correlationId?: string) => this.handleFacebookEvent(event, correlationId)
      );

      await this.messagingRepository.subscribe(
        'events.facebook.bottom',
        'facebook-collector-bottom',
        (event: FacebookEvent, correlationId?: string) => this.handleFacebookEvent(event, correlationId)
      );

      this.logger.log('Subscribed to Facebook events');
    } catch (error) {
      this.logger.error('Failed to subscribe to Facebook events', error.stack);
      throw error;
    }
  }

  @LogMethod()
  private async subscribeToTiktokEvents(): Promise<void> {
    try {
      await this.messagingRepository.subscribe(
        'events.tiktok.top',
        'tiktok-collector-top',
        (event: TiktokEvent, correlationId?: string) => this.handleTiktokEvent(event, correlationId)
      );

      await this.messagingRepository.subscribe(
        'events.tiktok.bottom',
        'tiktok-collector-bottom',
        (event: TiktokEvent, correlationId?: string) => this.handleTiktokEvent(event, correlationId)
      );

      this.logger.log('Subscribed to TikTok events');
    } catch (error) {
      this.logger.error('Failed to subscribe to TikTok events', error.stack);
      throw error;
    }
  }

  @LogMethod()
  private async handleFacebookEvent(event: FacebookEvent, correlationId?: string): Promise<void> {
    try {
      this.logger.log('Received Facebook event', {
        correlationId,
        eventId: event.eventId,
        eventType: event.eventType,
        funnelStage: event.funnelStage,
      });

      await this.eventProcessingService.processFacebookEvent(event, correlationId);
    } catch (error) {
      this.logger.error('Failed to handle Facebook event', error.stack, {
        correlationId,
        eventId: event.eventId,
      });
    }
  }

  @LogMethod()
  private async handleTiktokEvent(event: TiktokEvent, correlationId?: string): Promise<void> {
    try {
      this.logger.log('Received TikTok event', {
        correlationId,
        eventId: event.eventId,
        eventType: event.eventType,
        funnelStage: event.funnelStage,
      });

      await this.eventProcessingService.processTiktokEvent(event, correlationId);
    } catch (error) {
      this.logger.error('Failed to handle TikTok event', error.stack, {
        correlationId,
        eventId: event.eventId,
      });
    }
  }
}
