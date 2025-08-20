import { Test, TestingModule } from '@nestjs/testing';
import { EventCollectorService } from './event-collector.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';
import { NatsService } from '../../../shared/nats.service';
import { 
  createTestModule, 
  mockLogger, 
  mockPrismaService,
  mockNatsService,
  mockMetricsService,
  resetAllMocks,
  mockFacebookEvent,
  mockTiktokEvent,
  testErrors
} from '../test-utils';

const mockEnv = {
  COLLECTOR_TYPE: 'facebook',
};

Object.defineProperty(process, 'env', {
  value: mockEnv,
  writable: true,
});

describe('EventCollectorService', () => {
  let service: EventCollectorService;
  let prismaService: PrismaService;
  let metricsService: MetricsService;
  let natsService: NatsService;
  let module: TestingModule;

  beforeEach(async () => {
    resetAllMocks();
    
    process.env.COLLECTOR_TYPE = 'facebook';
    
    module = await createTestModule([
      EventCollectorService,
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: MetricsService, useValue: mockMetricsService },
      { provide: NatsService, useValue: mockNatsService },
    ]);

    service = module.get<EventCollectorService>(EventCollectorService);
    prismaService = module.get<PrismaService>(PrismaService);
    metricsService = module.get<MetricsService>(MetricsService);
    natsService = module.get<NatsService>(NatsService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('onModuleInit', () => {
    it('should initialize Facebook collector correctly', async () => {
      process.env.COLLECTOR_TYPE = 'facebook';
      
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await newService.onModuleInit();

      expect(mockNatsService.createStream).toHaveBeenCalledWith(
        'marketing-events',
        [
          'events.facebook.top',
          'events.facebook.bottom',
          'events.tiktok.top',
          'events.tiktok.bottom',
        ]
      );

      expect(mockNatsService.subscribeToStream).toHaveBeenCalledTimes(2);
      
      await newModule.close();
    });

    it('should initialize TikTok collector correctly', async () => {
      process.env.COLLECTOR_TYPE = 'tiktok';
      
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await newService.onModuleInit();

      expect(mockNatsService.createStream).toHaveBeenCalledWith(
        'marketing-events',
        [
          'events.facebook.top',
          'events.facebook.bottom',
          'events.tiktok.top',
          'events.tiktok.bottom',
        ]
      );

      expect(mockNatsService.subscribeToStream).toHaveBeenCalledTimes(2);
      
      await newModule.close();
    });

    it('should handle unknown collector type', async () => {
      process.env.COLLECTOR_TYPE = 'unknown';
      
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockResolvedValue(undefined);

      await newService.onModuleInit();

      expect(mockNatsService.subscribeToStream).not.toHaveBeenCalled();
      
      await newModule.close();
    });

    it('should handle stream creation failure', async () => {
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockRejectedValue(testErrors.natsError);

      await expect(newService.onModuleInit()).rejects.toThrow(testErrors.natsError);
      
      await newModule.close();
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle shutdown gracefully', async () => {
      await service.onModuleDestroy();
    });
  });

  describe('error handling and integration', () => {
    it('should handle service initialization without errors', async () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EventCollectorService);
    });

    it('should have correct dependencies injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('environment configuration', () => {
    it('should use default collector type when env var is not set', async () => {
      delete process.env.COLLECTOR_TYPE;
      
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockResolvedValue(undefined);

      await newService.onModuleInit();

      expect(mockNatsService.subscribeToStream).not.toHaveBeenCalled();
      
      await newModule.close();
    });

    it('should handle case sensitivity in collector type', async () => {
      process.env.COLLECTOR_TYPE = 'FACEBOOK';
      
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockResolvedValue(undefined);

      await newService.onModuleInit();

      expect(mockNatsService.subscribeToStream).not.toHaveBeenCalled();
      
      await newModule.close();
    });
  });

  describe('NATS stream configuration', () => {
    it('should create stream with correct subjects', async () => {
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockNatsService.createStream).toHaveBeenCalledWith(
        'marketing-events',
        [
          'events.facebook.top',
          'events.facebook.bottom',
          'events.tiktok.top',
          'events.tiktok.bottom',
        ]
      );
    });

    it('should handle stream creation with empty response', async () => {
      mockNatsService.createStream.mockResolvedValue(null);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockNatsService.createStream).toHaveBeenCalled();
    });
  });

  describe('subscription management', () => {
    it('should subscribe to correct Facebook subjects', async () => {
      process.env.COLLECTOR_TYPE = 'facebook';
      
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await newService.onModuleInit();

      expect(mockNatsService.subscribeToStream).toHaveBeenCalledWith(
        'marketing-events',
        'events.facebook.top',
        expect.any(Function)
      );

      expect(mockNatsService.subscribeToStream).toHaveBeenCalledWith(
        'marketing-events',
        'events.facebook.bottom',
        expect.any(Function)
      );
      
      await newModule.close();
    });

    it('should subscribe to correct TikTok subjects', async () => {
      process.env.COLLECTOR_TYPE = 'tiktok';
      
      const newModule = await createTestModule([
        EventCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: NatsService, useValue: mockNatsService },
      ]);
      
      const newService = newModule.get<EventCollectorService>(EventCollectorService);
      
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await newService.onModuleInit();

      expect(mockNatsService.subscribeToStream).toHaveBeenCalledWith(
        'marketing-events',
        'events.tiktok.top',
        expect.any(Function)
      );

      expect(mockNatsService.subscribeToStream).toHaveBeenCalledWith(
        'marketing-events',
        'events.tiktok.bottom',
        expect.any(Function)
      );
      
      await newModule.close();
    });

    it('should handle subscription failures gracefully', async () => {
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockRejectedValue(testErrors.natsError);

      await expect(service.onModuleInit()).rejects.toThrow(testErrors.natsError);
    });
  });

  describe('service lifecycle', () => {
    it('should handle complete initialization lifecycle', async () => {
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockNatsService.createStream).toHaveBeenCalled();
    });

    it('should handle reinitialization', async () => {
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await service.onModuleInit();
      await service.onModuleDestroy();
      await service.onModuleInit();

      expect(mockNatsService.createStream).toHaveBeenCalledTimes(2);
    });
  });

  describe('dependency interaction', () => {
    it('should interact correctly with NATS service', async () => {
      mockNatsService.createStream.mockResolvedValue(undefined);
      mockNatsService.subscribeToStream.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockNatsService.createStream).toHaveBeenCalledTimes(1);
      expect(mockNatsService.subscribeToStream).toHaveBeenCalledTimes(2);
    });

    it('should handle NATS service unavailability', async () => {
      mockNatsService.createStream.mockRejectedValue(new Error('NATS unavailable'));

      await expect(service.onModuleInit()).rejects.toThrow('NATS unavailable');
    });
  });
});