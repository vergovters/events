import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { ValidationService } from './validation.service';
import { MetricsService } from './metrics.service';
import { MessagingRepository } from '../repositories/messaging.repository';
import { 
  createTestModule, 
  mockMetricsService,
  resetAllMocks,
  mockFacebookEvent,
  mockTiktokEvent,
  testErrors
} from '../test-utils';

describe('WebhookService', () => {
  let service: WebhookService;
  let validationService: ValidationService;
  let metricsService: MetricsService;
  let messagingRepository: MessagingRepository;
  let module: TestingModule;

  const mockValidationService = {
    validateEvent: jest.fn(),
    validateFacebookEvent: jest.fn(),
    validateTiktokEvent: jest.fn(),
  };

  const mockMessagingRepository = {
    publishEvent: jest.fn(),
    initializeStreams: jest.fn(),
    subscribe: jest.fn(),
    checkConnection: jest.fn(),
  };

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      WebhookService,
      { provide: ValidationService, useValue: mockValidationService },
      { provide: MetricsService, useValue: mockMetricsService },
      { provide: MessagingRepository, useValue: mockMessagingRepository },
    ]);

    service = module.get<WebhookService>(WebhookService);
    validationService = module.get<ValidationService>(ValidationService);
    metricsService = module.get<MetricsService>(MetricsService);
    messagingRepository = module.get<MessagingRepository>(MessagingRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('processEvent', () => {
    it('should successfully process a Facebook event', async () => {
      const correlationId = 'test-corr-123';
      
      mockValidationService.validateEvent.mockReturnValue(mockFacebookEvent);
      mockMessagingRepository.publishEvent.mockResolvedValue(undefined);

      const result = await service.processEvent(mockFacebookEvent, correlationId);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(mockFacebookEvent.eventId);
      
      expect(mockValidationService.validateEvent).toHaveBeenCalledWith(mockFacebookEvent);
      expect(mockMessagingRepository.publishEvent).toHaveBeenCalledWith(mockFacebookEvent, correlationId);
      
      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('accepted', 1, {
        source: mockFacebookEvent.source,
        event_type: mockFacebookEvent.eventType,
        funnel_stage: mockFacebookEvent.funnelStage,
      });
      
      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('processed', 1, {
        source: mockFacebookEvent.source,
        event_type: mockFacebookEvent.eventType,
        funnel_stage: mockFacebookEvent.funnelStage,
      });

      expect(mockMetricsService.recordProcessingDuration).toHaveBeenCalledWith(
        expect.any(Number),
        {
          source: mockFacebookEvent.source,
          event_type: mockFacebookEvent.eventType,
        }
      );
    });

    it('should successfully process a TikTok event', async () => {
      const correlationId = 'test-corr-456';
      
      mockValidationService.validateEvent.mockReturnValue(mockTiktokEvent);
      mockMessagingRepository.publishEvent.mockResolvedValue(undefined);

      const result = await service.processEvent(mockTiktokEvent, correlationId);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(mockTiktokEvent.eventId);
      
      expect(mockValidationService.validateEvent).toHaveBeenCalledWith(mockTiktokEvent);
      expect(mockMessagingRepository.publishEvent).toHaveBeenCalledWith(mockTiktokEvent, correlationId);
      
      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('accepted', 1, {
        source: mockTiktokEvent.source,
        event_type: mockTiktokEvent.eventType,
        funnel_stage: mockTiktokEvent.funnelStage,
      });
    });

    it('should handle event processing without correlation ID', async () => {
      mockValidationService.validateEvent.mockReturnValue(mockFacebookEvent);
      mockMessagingRepository.publishEvent.mockResolvedValue(undefined);

      const result = await service.processEvent(mockFacebookEvent);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(mockFacebookEvent.eventId);
      expect(mockMessagingRepository.publishEvent).toHaveBeenCalledWith(mockFacebookEvent, undefined);
    });

    it('should handle validation errors', async () => {
      const invalidEvent = { invalid: 'data' };
      const validationError = new Error('Invalid event format');
      
      mockValidationService.validateEvent.mockImplementation(() => {
        throw validationError;
      });

      await expect(service.processEvent(invalidEvent, 'corr-123')).rejects.toThrow(validationError);

      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('failed', 1, {
        source: 'unknown',
        event_type: 'unknown',
        error: validationError.message,
      });

      expect(mockMessagingRepository.publishEvent).not.toHaveBeenCalledWith(invalidEvent, 'corr-123');
    });

    it('should handle messaging errors', async () => {
      const correlationId = 'test-corr-789';
      
      mockValidationService.validateEvent.mockReturnValue(mockFacebookEvent);
      mockMessagingRepository.publishEvent.mockRejectedValue(testErrors.natsError);

      await expect(service.processEvent(mockFacebookEvent, correlationId)).rejects.toThrow(testErrors.natsError);

      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('accepted', 1, expect.any(Object));
      
      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('failed', 1, {
        source: mockFacebookEvent.source,
        event_type: mockFacebookEvent.eventType,
        error: testErrors.natsError.message,
      });
    });

    it('should handle events with missing source information gracefully', async () => {
      const eventWithoutSource = { eventId: 'test', data: {} };
      const validationError = new Error('Missing source');
      
      mockValidationService.validateEvent.mockImplementation(() => {
        throw validationError;
      });

      await expect(service.processEvent(eventWithoutSource, 'corr-123')).rejects.toThrow(validationError);

      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('failed', 1, {
        source: 'unknown',
        event_type: 'unknown',
        error: validationError.message,
      });
    });

    it('should handle events with partial source information', async () => {
      const eventWithPartialInfo = { source: 'facebook', data: {} };
      const validationError = new Error('Missing event type');
      
      mockValidationService.validateEvent.mockImplementation(() => {
        throw validationError;
      });

      await expect(service.processEvent(eventWithPartialInfo, 'corr-123')).rejects.toThrow(validationError);

      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('failed', 1, {
        source: 'facebook',
        event_type: 'unknown',
        error: validationError.message,
      });
    });

    it('should measure processing duration accurately', async () => {
      mockValidationService.validateEvent.mockReturnValue(mockFacebookEvent);
      mockMessagingRepository.publishEvent.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      await service.processEvent(mockFacebookEvent, 'duration-test');

      expect(mockMetricsService.recordProcessingDuration).toHaveBeenCalledWith(
        expect.any(Number),
        {
          source: mockFacebookEvent.source,
          event_type: mockFacebookEvent.eventType,
        }
      );

      const recordedDuration = mockMetricsService.recordProcessingDuration.mock.calls[0][0];
      expect(recordedDuration).toBeGreaterThan(90);
      expect(recordedDuration).toBeLessThan(200);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle null event data', async () => {
      const validationError = new Error('Event data is null');
      mockValidationService.validateEvent.mockImplementation(() => {
        throw validationError;
      });

      await expect(service.processEvent(null, 'null-test')).rejects.toThrow(validationError);

      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('failed', 1, {
        source: 'unknown',
        event_type: 'unknown',
        error: validationError.message,
      });
    });

    it('should handle undefined event data', async () => {
      const validationError = new Error('Event data is undefined');
      mockValidationService.validateEvent.mockImplementation(() => {
        throw validationError;
      });

      await expect(service.processEvent(undefined, 'undefined-test')).rejects.toThrow(validationError);

      expect(mockMetricsService.recordMetric).toHaveBeenCalledWith('failed', 1, {
        source: 'unknown',
        event_type: 'unknown',
        error: validationError.message,
      });
    });

    it('should handle events with complex nested data', async () => {
      const complexEvent = {
        ...mockFacebookEvent,
        data: {
          ...mockFacebookEvent.data,
          nested: {
            deep: {
              value: 'test',
              array: [1, 2, 3],
            },
          },
        },
      };

      mockValidationService.validateEvent.mockReturnValue(complexEvent);
      mockMessagingRepository.publishEvent.mockResolvedValue(undefined);

      const result = await service.processEvent(complexEvent, 'complex-test');

      expect(result.success).toBe(true);
      expect(mockMessagingRepository.publishEvent).toHaveBeenCalledWith(complexEvent, 'complex-test');
    });

    it('should handle very large event payloads', async () => {
      const largeEvent = {
        ...mockFacebookEvent,
        data: {
          ...mockFacebookEvent.data,
          largeField: 'x'.repeat(50000),
        },
      };

      mockValidationService.validateEvent.mockReturnValue(largeEvent);
      mockMessagingRepository.publishEvent.mockResolvedValue(undefined);

      const result = await service.processEvent(largeEvent, 'large-test');

      expect(result.success).toBe(true);
    });
  });

  describe('concurrent processing', () => {
    it('should handle mixed success and failure scenarios', async () => {
      const events = [
        { ...mockFacebookEvent, eventId: 'success-1' },
        { invalid: 'event' },
        { ...mockTiktokEvent, eventId: 'success-2' },
        { malformed: 'data' },
      ];

      mockValidationService.validateEvent
        .mockReturnValueOnce(events[0])
        .mockImplementationOnce(() => { throw new Error('Invalid event'); })
        .mockReturnValueOnce(events[2])
        .mockImplementationOnce(() => { throw new Error('Malformed data'); });

      mockMessagingRepository.publishEvent.mockResolvedValue(undefined);

      const results = await Promise.allSettled(
        events.map((event, i) => service.processEvent(event, `mixed-corr-${i}`))
      );

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      expect(results[3].status).toBe('rejected');

      expect(mockMetricsService.recordMetric).toHaveBeenCalledTimes(6);
    });
  });
});