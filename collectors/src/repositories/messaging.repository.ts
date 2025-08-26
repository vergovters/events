import { Injectable } from '@nestjs/common';
import { StructuredLogger, LogMethod } from '@shared/logger';
import { NatsService } from '@shared/nats.service';

@Injectable()
export class MessagingRepository {
  private readonly logger = new StructuredLogger('MessagingRepository');

  constructor(private readonly natsService: NatsService) {}

  @LogMethod()
  async initializeStreams(subjects: string[]): Promise<void> {
    try {
      this.logger.log('Initializing NATS streams', { subjects });
      
      await this.natsService.ensureStream('marketing-events', subjects);
      
      this.logger.log('NATS streams initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize streams', error.stack);
      throw error;
    }
  }

  @LogMethod()
  async subscribe(
    subject: string,
    durableName: string,
    handler: (event: any, correlationId?: string) => Promise<void>
  ): Promise<void> {
    try {
      this.logger.log('Setting up subscription', { subject, durableName });

      await this.natsService.subscribe(
        subject,
        async (data: any) => {
          try {
            const correlationId = data.correlationId;
            
            this.logger.log('Received event from stream', {
              subject,
              correlationId,
              eventId: data.eventId,
            });

            await handler(data, correlationId);
          } catch (error) {
            this.logger.error('Failed to process received event', error.stack, {
              subject,
              data: JSON.stringify(data),
            });
          }
        },
        { queue: durableName }
      );

      this.logger.log('Subscription established', { subject, durableName });
    } catch (error) {
      this.logger.error('Failed to set up subscription', error.stack, {
        subject,
        durableName,
      });
      throw error;
    }
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
