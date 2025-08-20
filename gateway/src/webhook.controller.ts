import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { LogMethod } from '@shared/logger';
import { WebhookService } from './services/webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @LogMethod()
  async receiveWebhook(
    @Body() body: any,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    try {
      const result = await this.webhookService.processEvent(body, correlationId);
      
      this.logger.log('Webhook processed successfully', {
        eventId: result.eventId,
        correlationId,
      });

      return {
        success: result.success,
        eventId: result.eventId,
        correlationId: correlationId || this.generateCorrelationId(),
      };
    } catch (error) {
      this.logger.error('Failed to process webhook', error.stack, {
        correlationId,
      });
      
      throw error;
    }
  }

  private generateCorrelationId(): string {
    return `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

