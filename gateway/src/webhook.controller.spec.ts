import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './services/webhook.service';
import { 
  createTestModule,
  resetAllMocks,
  mockFacebookEvent,
  mockTiktokEvent 
} from './test-utils';

describe('WebhookController', () => {
  let controller: WebhookController;
  let webhookService: WebhookService;
  let module: TestingModule;

  const mockWebhookService = {
    processEvent: jest.fn(),
  };

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      WebhookController,
      { provide: WebhookService, useValue: mockWebhookService },
    ], [], [
      WebhookController,
    ]);

    controller = module.get<WebhookController>(WebhookController);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('receiveWebhook', () => {
    it('should successfully process a webhook', async () => {
      const correlationId = 'test-corr-123';
      const expectedResult = {
        success: true,
        eventId: mockFacebookEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockFacebookEvent, correlationId);

      expect(result).toEqual({
        success: true,
        eventId: mockFacebookEvent.eventId,
        correlationId: correlationId,
      });

      expect(mockWebhookService.processEvent).toHaveBeenCalledWith(mockFacebookEvent, correlationId);
    });

    it('should process webhook without correlation ID', async () => {
      const expectedResult = {
        success: true,
        eventId: mockTiktokEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockTiktokEvent);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(mockTiktokEvent.eventId);
      expect(result.correlationId).toMatch(/^gateway-\d+-[a-z0-9]+$/);

      expect(mockWebhookService.processEvent).toHaveBeenCalledWith(mockTiktokEvent, undefined);
    });

    it('should handle webhook processing failure', async () => {
      const correlationId = 'test-error-corr';
      const error = new Error('Processing failed');

      mockWebhookService.processEvent.mockRejectedValue(error);

      await expect(controller.receiveWebhook(mockFacebookEvent, correlationId)).rejects.toThrow(error);

      expect(mockWebhookService.processEvent).toHaveBeenCalledWith(mockFacebookEvent, correlationId);
    });

    it('should handle malformed webhook data', async () => {
      const malformedData = { invalid: 'data' };
      const correlationId = 'malformed-corr';
      const error = new Error('Invalid event format');

      mockWebhookService.processEvent.mockRejectedValue(error);

      await expect(controller.receiveWebhook(malformedData, correlationId)).rejects.toThrow(error);
    });

    it('should handle empty webhook body', async () => {
      const emptyBody = {};
      const correlationId = 'empty-corr';
      const error = new Error('Empty event body');

      mockWebhookService.processEvent.mockRejectedValue(error);

      await expect(controller.receiveWebhook(emptyBody, correlationId)).rejects.toThrow(error);
    });

    it('should handle null webhook body', async () => {
      const nullBody = null;
      const correlationId = 'null-corr';
      const error = new Error('Null event body');

      mockWebhookService.processEvent.mockRejectedValue(error);

      await expect(controller.receiveWebhook(nullBody, correlationId)).rejects.toThrow(error);
    });
  });

  describe('correlation ID generation', () => {
    it('should generate correlation ID when not provided', async () => {
      const expectedResult = {
        success: true,
        eventId: mockFacebookEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockFacebookEvent);

      expect(result.correlationId).toBeDefined();
      expect(result.correlationId).toMatch(/^gateway-\d+-[a-z0-9]+$/);
    });

    it('should use provided correlation ID when available', async () => {
      const correlationId = 'custom-corr-456';
      const expectedResult = {
        success: true,
        eventId: mockTiktokEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockTiktokEvent, correlationId);

      expect(result.correlationId).toBe(correlationId);
    });

    it('should generate unique correlation IDs', async () => {
      const expectedResult = {
        success: true,
        eventId: mockFacebookEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const results = await Promise.all([
        controller.receiveWebhook(mockFacebookEvent),
        controller.receiveWebhook(mockFacebookEvent),
        controller.receiveWebhook(mockFacebookEvent),
      ]);

      const correlationIds = results.map(r => r.correlationId);
      const uniqueIds = new Set(correlationIds);
      
      expect(uniqueIds.size).toBe(3);
      correlationIds.forEach(id => {
        expect(id).toMatch(/^gateway-\d+-[a-z0-9]+$/);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle Facebook events correctly', async () => {
      const correlationId = 'fb-integration-test';
      const expectedResult = {
        success: true,
        eventId: mockFacebookEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockFacebookEvent, correlationId);

      expect(result).toEqual({
        success: true,
        eventId: mockFacebookEvent.eventId,
        correlationId: correlationId,
      });
    });

    it('should handle TikTok events correctly', async () => {
      const correlationId = 'ttk-integration-test';
      const expectedResult = {
        success: true,
        eventId: mockTiktokEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockTiktokEvent, correlationId);

      expect(result).toEqual({
        success: true,
        eventId: mockTiktokEvent.eventId,
        correlationId: correlationId,
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      const events = [
        { ...mockFacebookEvent, eventId: 'success-1' },
        { invalid: 'event' },
        { ...mockTiktokEvent, eventId: 'success-2' },
      ];

      mockWebhookService.processEvent
        .mockResolvedValueOnce({ success: true, eventId: 'success-1' })
        .mockRejectedValueOnce(new Error('Invalid event'))
        .mockResolvedValueOnce({ success: true, eventId: 'success-2' });

      const results = await Promise.allSettled([
        controller.receiveWebhook(events[0], 'success-corr-1'),
        controller.receiveWebhook(events[1], 'error-corr'),
        controller.receiveWebhook(events[2], 'success-corr-2'),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      if (results[0].status === 'fulfilled') {
        expect(results[0].value.eventId).toBe('success-1');
      }
      if (results[2].status === 'fulfilled') {
        expect(results[2].value.eventId).toBe('success-2');
      }
    });
  });

  describe('performance tests', () => {
    it('should handle rapid webhook requests', async () => {
      const events = Array(50).fill(null).map((_, i) => ({
        ...mockFacebookEvent,
        eventId: `rapid-${i}`,
      }));

      mockWebhookService.processEvent.mockImplementation(event => 
        Promise.resolve({ success: true, eventId: event.eventId })
      );

      const startTime = Date.now();
      const promises = events.map((event, i) => 
        controller.receiveWebhook(event, `rapid-corr-${i}`)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.eventId).toBe(`rapid-${i}`);
      });

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle large webhook payloads', async () => {
      const largeEvent = {
        ...mockFacebookEvent,
        data: {
          ...mockFacebookEvent.data,
          largeField: 'x'.repeat(100000),
        },
      };

      const expectedResult = {
        success: true,
        eventId: largeEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(largeEvent, 'large-payload-test');

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(largeEvent.eventId);
    });
  });

  describe('error edge cases', () => {
    it('should handle webhook service throwing non-Error objects', async () => {
      const correlationId = 'non-error-test';
      const nonErrorThrow = 'String error';

      mockWebhookService.processEvent.mockRejectedValue(nonErrorThrow);

      await expect(controller.receiveWebhook(mockFacebookEvent, correlationId)).rejects.toBe(nonErrorThrow);
    });

    it('should handle webhook service returning malformed results', async () => {
      const correlationId = 'malformed-result-test';
      const malformedResult = { notSuccess: true };

      mockWebhookService.processEvent.mockResolvedValue(malformedResult);

      const result = await controller.receiveWebhook(mockFacebookEvent, correlationId);

      expect(result.correlationId).toBe(correlationId);
    });

    it('should handle very long correlation IDs', async () => {
      const longCorrelationId = 'x'.repeat(1000);
      const expectedResult = {
        success: true,
        eventId: mockFacebookEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockFacebookEvent, longCorrelationId);

      expect(result.correlationId).toBe(longCorrelationId);
    });

    it('should handle special characters in correlation IDs', async () => {
      const specialCorrelationId = 'test-🚀-corr-💻-123';
      const expectedResult = {
        success: true,
        eventId: mockTiktokEvent.eventId,
      };

      mockWebhookService.processEvent.mockResolvedValue(expectedResult);

      const result = await controller.receiveWebhook(mockTiktokEvent, specialCorrelationId);

      expect(result.correlationId).toBe(specialCorrelationId);
    });
  });
});