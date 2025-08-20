import { Test, TestingModule } from '@nestjs/testing';
import { MessagingRepository } from './messaging.repository';
import { NatsService } from '../../../shared/nats.service';
import { 
  createTestModule, 
  mockNatsService,
  resetAllMocks,
  testErrors,
  mockEventData
} from '../test-utils';

describe('MessagingRepository', () => {
  let repository: MessagingRepository;
  let natsService: NatsService;
  let module: TestingModule;

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      MessagingRepository,
      { provide: NatsService, useValue: mockNatsService },
    ]);

    repository = module.get<MessagingRepository>(MessagingRepository);
    natsService = module.get<NatsService>(NatsService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('initializeStreams', () => {
    it('should initialize NATS streams successfully', async () => {
      const subjects = ['events.facebook.top', 'events.facebook.bottom'];
      mockNatsService.ensureStream.mockResolvedValue(undefined);

      await repository.initializeStreams(subjects);

      expect(mockNatsService.ensureStream).toHaveBeenCalledWith(
        'marketing-events',
        subjects
      );

      expect(mockNatsService.ensureStream).toHaveBeenCalledTimes(1);
    });

    it('should handle stream initialization failure', async () => {
      const subjects = ['events.tiktok.top', 'events.tiktok.bottom'];
      mockNatsService.ensureStream.mockRejectedValue(testErrors.natsError);

      await expect(repository.initializeStreams(subjects)).rejects.toThrow(testErrors.natsError);
    });

    it('should handle empty subjects array', async () => {
      const subjects: string[] = [];
      mockNatsService.ensureStream.mockResolvedValue(undefined);

      await repository.initializeStreams(subjects);

      expect(mockNatsService.ensureStream).toHaveBeenCalledWith(
        'marketing-events',
        subjects
      );
    });

    it('should handle multiple subject initialization', async () => {
      const subjects = [
        'events.facebook.top',
        'events.facebook.bottom',
        'events.tiktok.top',
        'events.tiktok.bottom',
        'events.instagram.top',
      ];
      mockNatsService.ensureStream.mockResolvedValue(undefined);

      await repository.initializeStreams(subjects);

      expect(mockNatsService.ensureStream).toHaveBeenCalledWith(
        'marketing-events',
        subjects
      );
    });
  });

  describe('subscribe', () => {
    const mockEventData = {
      eventId: 'test-event-123',
      timestamp: '2024-01-15T10:00:00Z',
      source: 'facebook',
      correlationId: 'corr-123',
    };

    it('should set up subscription successfully', async () => {
      const subject = 'events.facebook.top';
      const durableName = 'facebook-collector';
      const mockHandler = jest.fn().mockResolvedValue(undefined);

      mockNatsService.subscribe.mockResolvedValue(undefined);

      await repository.subscribe(subject, durableName, mockHandler);

      expect(mockNatsService.subscribe).toHaveBeenCalledWith(
        subject,
        expect.any(Function),
        { queue: durableName }
      );
    });

    it('should process received events correctly', async () => {
      const subject = 'events.facebook.top';
      const durableName = 'facebook-collector';
      const mockHandler = jest.fn().mockResolvedValue(undefined);

      let subscriptionCallback: Function;

      mockNatsService.subscribe.mockImplementation((sub, callback, opts) => {
        subscriptionCallback = callback;
        return Promise.resolve(undefined);
      });

      await repository.subscribe(subject, durableName, mockHandler);

      await subscriptionCallback(mockEventData);

      expect(mockHandler).toHaveBeenCalledWith(
        mockEventData,
        'corr-123'
      );
    });

    it('should handle events without correlation ID', async () => {
      const subject = 'events.tiktok.bottom';
      const durableName = 'tiktok-collector';
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const eventWithoutCorrelation = {
        ...mockEventData,
        correlationId: undefined,
      };

      let subscriptionCallback: Function;

      mockNatsService.subscribe.mockImplementation((sub, callback, opts) => {
        subscriptionCallback = callback;
        return Promise.resolve(undefined);
      });

      await repository.subscribe(subject, durableName, mockHandler);

      await subscriptionCallback(eventWithoutCorrelation);

      expect(mockHandler).toHaveBeenCalledWith(
        eventWithoutCorrelation,
        undefined
      );
    });

    it('should handle handler errors gracefully', async () => {
      const subject = 'events.facebook.bottom';
      const durableName = 'facebook-collector';
      const handlerError = new Error('Handler processing failed');
      const mockHandler = jest.fn().mockRejectedValue(handlerError);

      let subscriptionCallback: Function;

      mockNatsService.subscribe.mockImplementation((sub, callback, opts) => {
        subscriptionCallback = callback;
        return Promise.resolve(undefined);
      });

      await repository.subscribe(subject, durableName, mockHandler);

      await subscriptionCallback(mockEventData);

      expect(mockHandler).toHaveBeenCalledWith(mockEventData, 'corr-123');
    });

    it('should handle malformed event data', async () => {
      const subject = 'events.facebook.top';
      const durableName = 'facebook-collector';
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const malformedData = {
        invalid: 'data',
      };

      let subscriptionCallback: Function;

      mockNatsService.subscribe.mockImplementation((sub, callback, opts) => {
        subscriptionCallback = callback;
        return Promise.resolve(undefined);
      });

      await repository.subscribe(subject, durableName, mockHandler);

      await subscriptionCallback(malformedData);

      expect(mockHandler).toHaveBeenCalledWith(malformedData, undefined);
    });

    it('should handle subscription setup failure', async () => {
      const subject = 'events.invalid';
      const durableName = 'test-collector';
      const mockHandler = jest.fn();

      mockNatsService.subscribe.mockRejectedValue(testErrors.natsError);

      await expect(repository.subscribe(subject, durableName, mockHandler)).rejects.toThrow(testErrors.natsError);
    });

    it('should handle multiple subscriptions', async () => {
      const subscriptions = [
        { subject: 'events.facebook.top', durableName: 'fb-top-collector' },
        { subject: 'events.facebook.bottom', durableName: 'fb-bottom-collector' },
        { subject: 'events.tiktok.top', durableName: 'ttk-top-collector' },
      ];

      const mockHandler = jest.fn().mockResolvedValue(undefined);
      mockNatsService.subscribe.mockResolvedValue(undefined);

      for (const { subject, durableName } of subscriptions) {
        await repository.subscribe(subject, durableName, mockHandler);
      }

      expect(mockNatsService.subscribe).toHaveBeenCalledTimes(3);
    });
  });

  describe('checkConnection', () => {
    it('should return true when NATS is connected', async () => {
      mockNatsService.isConnected.mockReturnValue(true);

      const result = await repository.checkConnection();

      expect(result).toBe(true);
      expect(mockNatsService.isConnected).toHaveBeenCalled();
    });

    it('should return false when NATS is not connected', async () => {
      mockNatsService.isConnected.mockReturnValue(false);

      const result = await repository.checkConnection();

      expect(result).toBe(false);
      expect(mockNatsService.isConnected).toHaveBeenCalled();
    });

    it('should handle connection check errors', async () => {
      mockNatsService.isConnected.mockImplementation(() => {
        throw testErrors.natsError;
      });

      const result = await repository.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete initialization and subscription flow', async () => {
      const subjects = ['events.facebook.top', 'events.facebook.bottom'];
      const mockHandler = jest.fn().mockResolvedValue(undefined);

      mockNatsService.ensureStream.mockResolvedValue(undefined);
      mockNatsService.subscribe.mockResolvedValue(undefined);
      mockNatsService.isConnected.mockReturnValue(true);

      await repository.initializeStreams(subjects);

      for (const subject of subjects) {
        await repository.subscribe(subject, 'test-collector', mockHandler);
      }

      const isConnected = await repository.checkConnection();

      expect(isConnected).toBe(true);
      expect(mockNatsService.ensureStream).toHaveBeenCalledWith('marketing-events', subjects);
      expect(mockNatsService.subscribe).toHaveBeenCalledTimes(2);
      expect(mockNatsService.isConnected).toHaveBeenCalled();
    });

    it('should handle event processing with different correlation IDs', async () => {
      const subject = 'events.test';
      const durableName = 'test-collector';
      const mockHandler = jest.fn().mockResolvedValue(undefined);

      const events = [
        { ...mockEventData, correlationId: 'corr-1', eventId: 'event-1' },
        { ...mockEventData, correlationId: 'corr-2', eventId: 'event-2' },
        { ...mockEventData, correlationId: undefined, eventId: 'event-3' },
      ];

      let subscriptionCallback: Function;

      mockNatsService.subscribe.mockImplementation((sub, callback, opts) => {
        subscriptionCallback = callback;
        return Promise.resolve(undefined);
      });

      await repository.subscribe(subject, durableName, mockHandler);

      for (const event of events) {
        await subscriptionCallback(event);
      }

      expect(mockHandler).toHaveBeenCalledTimes(3);
      expect(mockHandler).toHaveBeenNthCalledWith(1, events[0], 'corr-1');
      expect(mockHandler).toHaveBeenNthCalledWith(2, events[1], 'corr-2');
      expect(mockHandler).toHaveBeenNthCalledWith(3, events[2], undefined);
    });

    it('should handle concurrent event processing', async () => {
      const subject = 'events.concurrent.test';
      const durableName = 'concurrent-collector';
      const mockHandler = jest.fn().mockImplementation(
        (data) => new Promise(resolve => setTimeout(resolve, 10))
      );

      let subscriptionCallback: Function;

      mockNatsService.subscribe.mockImplementation((sub, callback, opts) => {
        subscriptionCallback = callback;
        return Promise.resolve(undefined);
      });

      await repository.subscribe(subject, durableName, mockHandler);

      const events = Array(5).fill(null).map((_, i) => ({
        ...mockEventData,
        eventId: `concurrent-event-${i}`,
        correlationId: `corr-${i}`,
      }));

      await Promise.all(events.map(event => subscriptionCallback(event)));

      expect(mockHandler).toHaveBeenCalledTimes(5);
    });
  });
});
