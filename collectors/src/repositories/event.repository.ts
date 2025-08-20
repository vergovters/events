import { Injectable } from '@nestjs/common';
import { Event, FacebookEvent, TiktokEvent } from '../../../shared/types';
import { StructuredLogger, LogMethod } from '../../../shared/logger';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventRepository {
  private readonly logger = new StructuredLogger('EventRepository');

  constructor(private readonly prisma: PrismaService) {}

  @LogMethod()
  async saveEvent(event: Event, correlationId?: string): Promise<void> {
    try {
      this.logger.log('Saving event to database', {
        correlationId,
        eventId: event.eventId,
        source: event.source,
        eventType: event.eventType,
      });

      const eventRecord = await this.prisma.event.create({
        data: {
          eventId: event.eventId,
          timestamp: new Date(event.timestamp),
          source: event.source,
          funnelStage: event.funnelStage,
          eventType: event.eventType,
          userData: JSON.parse(JSON.stringify(event.data.user)),
          engagementData: JSON.parse(JSON.stringify(event.data.engagement)),
          correlationId: correlationId,
          processedAt: new Date(),
          userId: event.data.user?.userId || null,
          userName: (event.data.user as any)?.name || (event.data.user as any)?.username || null,
          userAge: (event.data.user as any)?.age || null,
          userGender: (event.data.user as any)?.gender || null,
          userCountry: (event.data.user as any)?.location?.country || null,
          userCity: (event.data.user as any)?.location?.city || null,
          userFollowers: (event.data.user as any)?.followers || null,
        },
      });

      this.logger.log('Event saved to database', {
        correlationId,
        eventId: event.eventId,
        dbId: eventRecord.id,
      });

    } catch (error) {
      this.logger.error('Failed to save event to database', error.stack, {
        correlationId,
        eventId: event.eventId,
        source: event.source,
        error: error.message,
      });
      
      throw error;
    }
  }

  @LogMethod()
  async saveFacebookEvent(event: FacebookEvent, correlationId?: string): Promise<void> {
    await this.saveEvent(event, correlationId);
  }

  @LogMethod()
  async saveTiktokEvent(event: TiktokEvent, correlationId?: string): Promise<void> {
    await this.saveEvent(event, correlationId);
  }

  async getEventById(eventId: string): Promise<any | null> {
    try {
      return await this.prisma.event.findUnique({
        where: { eventId },
      });
    } catch (error) {
      this.logger.error('Failed to get event by ID', error.stack, { eventId });
      throw error;
    }
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed', error.stack);
      return false;
    }
  }
}
