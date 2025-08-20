import { Injectable, BadRequestException } from '@nestjs/common';
import { Event, FacebookEvent, TiktokEvent } from '@shared/types';
import { StructuredLogger } from '@shared/logger';
import { z } from 'zod';

const FacebookEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  source: z.literal('facebook'),
  funnelStage: z.enum(['top', 'bottom']),
  eventType: z.string(),
  data: z.object({
    user: z.object({
      userId: z.string(),
      name: z.string(),
      age: z.number(),
      gender: z.enum(['male', 'female', 'non-binary']),
      location: z.object({
        country: z.string(),
        city: z.string(),
      }),
    }),
    engagement: z.any(),
  }),
});

const TiktokEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  source: z.literal('tiktok'),
  funnelStage: z.enum(['top', 'bottom']),
  eventType: z.string(),
  data: z.object({
    user: z.object({
      userId: z.string(),
      username: z.string(),
      followers: z.number(),
    }),
    engagement: z.any(),
  }),
});

const EventSchema = z.union([FacebookEventSchema, TiktokEventSchema]);

@Injectable()
export class ValidationService {
  private readonly logger = new StructuredLogger('ValidationService');

  validateEvent(eventData: any): Event {
    try {
      const validatedEvent = EventSchema.parse(eventData) as Event;
      
      this.logger.log('Event validation successful', {
        eventId: validatedEvent.eventId,
        source: validatedEvent.source,
        eventType: validatedEvent.eventType,
      });

      return validatedEvent;
    } catch (error) {
      this.logger.error('Event validation failed', error.message, {
        eventData: JSON.stringify(eventData),
      });

      throw new BadRequestException(`Invalid event format: ${error.message}`);
    }
  }

  validateFacebookEvent(eventData: any): FacebookEvent {
    try {
      return FacebookEventSchema.parse(eventData) as FacebookEvent;
    } catch (error) {
      throw new BadRequestException(`Invalid Facebook event format: ${error.message}`);
    }
  }

  validateTiktokEvent(eventData: any): TiktokEvent {
    try {
      return TiktokEventSchema.parse(eventData) as TiktokEvent;
    } catch (error) {
      throw new BadRequestException(`Invalid TikTok event format: ${error.message}`);
    }
  }
}
