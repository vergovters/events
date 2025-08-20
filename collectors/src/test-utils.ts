import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

export const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

export const mockPrismaService = {
  event: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  processedEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  metrics: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
};

export const mockNatsService = {
  publish: jest.fn(),
  publishToStream: jest.fn(),
  subscribe: jest.fn(),
  subscribeToStream: jest.fn(),
  createStream: jest.fn(),
  ensureStream: jest.fn(),
  getConnection: jest.fn(),
  getJetStream: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
};

export const mockMetricsService = {
  recordMetric: jest.fn(),
  recordProcessingDuration: jest.fn(),
  setActiveConnections: jest.fn(),
  getMetrics: jest.fn(),
  getRegistry: jest.fn(),
};

export async function createTestModule(
  providers: any[],
  imports: any[] = [],
  controllers: any[] = []
): Promise<TestingModule> {
  const module: TestingModule = await Test.createTestingModule({
    imports,
    controllers,
    providers,
  })
    .overrideProvider(Logger)
    .useValue(mockLogger)
    .compile();

  return module;
}


export const mockFacebookEvent = {
  eventId: 'fb-event-123',
  timestamp: '2024-01-15T10:00:00Z',
  source: 'facebook' as const,
  funnelStage: 'top' as const,
  eventType: 'ad.view' as const,
  data: {
    user: {
      userId: 'user-123',
      name: 'John Doe',
      age: 28,
      gender: 'male' as const,
      location: {
        country: 'US',
        city: 'New York',
      },
    },
    engagement: {
      actionTime: '2024-01-15T10:00:00Z',
      referrer: 'newsfeed' as const,
      videoId: 'video-123',
    },
  },
};

export const mockTiktokEvent = {
  eventId: 'ttk-event-123',
  timestamp: '2024-01-15T10:00:00Z',
  source: 'tiktok' as const,
  funnelStage: 'bottom' as const,
  eventType: 'purchase' as const,
  data: {
    user: {
      userId: 'user-456',
      username: 'johndoe_ttk',
      followers: 1500,
    },
    engagement: {
      actionTime: '2024-01-15T10:00:00Z',
      profileId: 'profile-456',
      purchasedItem: 'Product A',
      purchaseAmount: '29.99',
    },
  },
};

export function resetAllMocks() {
  Object.values(mockLogger).forEach(mock => mock.mockReset());
  Object.values(mockPrismaService.event).forEach(mock => mock.mockReset());
  Object.values(mockPrismaService.processedEvent).forEach(mock => mock.mockReset());
  Object.values(mockPrismaService.metrics).forEach(mock => mock.mockReset());
  mockPrismaService.$queryRaw.mockReset();
  mockPrismaService.$disconnect.mockReset();
  Object.values(mockNatsService).forEach(mock => mock.mockReset());
  Object.values(mockMetricsService).forEach(mock => mock.mockReset());
}

export const testErrors = {
  prismaError: new Error('Database connection failed'),
  natsError: new Error('NATS connection failed'),
  validationError: new Error('Validation failed'),
  networkError: new Error('Network error'),
};

export const mockEventData = {
  eventId: 'test-event-123',
  source: 'facebook' as const,
  eventType: 'ad.view' as const,
  funnelStage: 'top' as const,
  timestamp: '2024-01-15T10:00:00Z',
  data: {
    user: {
      userId: 'user-123',
      name: 'John Doe',
    },
    engagement: {
      actionTime: '2024-01-15T10:00:00Z',
    },
  },
};
