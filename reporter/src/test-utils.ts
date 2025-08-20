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
  recordRequestStart: jest.fn(),
  recordRequestSuccess: jest.fn(),
  recordRequestFailure: jest.fn(),
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

export const mockEventStatistics = {
  totalEvents: 1500,
  eventsByType: {
    'ad.view': 800,
    'ad.click': 400,
    'purchase': 200,
    'add_to_cart': 100,
  },
  eventsByFunnelStage: {
    'top': 1200,
    'bottom': 300,
  },
  eventsBySource: {
    'facebook': 900,
    'tiktok': 600,
  },
  eventsByTime: [
    { timestamp: '2024-01-15T00:00:00Z', count: 100 },
    { timestamp: '2024-01-15T01:00:00Z', count: 150 },
    { timestamp: '2024-01-15T02:00:00Z', count: 200 },
  ],
};

export const mockRevenueData = {
  totalRevenue: 15000.50,
  revenueBySource: {
    'facebook': '9000.30',
    'tiktok': '6000.20',
  },
  revenueByCampaign: {
    'summer_sale': '8000.00',
    'winter_promo': '7000.50',
  },
  revenueByTime: [
    { timestamp: '2024-01-15T00:00:00Z', amount: '1000.00' },
    { timestamp: '2024-01-15T01:00:00Z', amount: '1500.25' },
    { timestamp: '2024-01-15T02:00:00Z', amount: '2000.50' },
  ],
  transactionCount: 150,
};

export const mockDemographicsData = {
  facebook: {
    ageDistribution: {
      '18-24': 250,
      '25-34': 400,
      '35-44': 200,
      '45-54': 100,
      '55+': 50,
    },
    genderDistribution: {
      'male': 600,
      'female': 400,
    },
    topLocations: [
      { country: 'US', city: 'New York', count: 300 },
      { country: 'UK', city: 'London', count: 200 },
      { country: 'CA', city: 'Toronto', count: 150 },
    ],
  },
  tiktok: {
    followerDistribution: [
      { range: '0-1000', count: 200 },
      { range: '1000-10000', count: 300 },
      { range: '10000+', count: 100 },
    ],
    topCountries: [
      { country: 'US', count: 300 },
      { country: 'UK', count: 200 },
      { country: 'CA', count: 100 },
    ],
  },
};

export function resetAllMocks() {
  Object.values(mockLogger).forEach(mock => mock.mockReset());
  Object.values(mockPrismaService.event).forEach(mock => mock.mockReset());
  mockPrismaService.$queryRaw.mockReset();
  mockPrismaService.$disconnect.mockReset();
  Object.values(mockNatsService).forEach(mock => mock.mockReset());
  Object.values(mockMetricsService).forEach(mock => mock.mockReset());
}

export const mockReportFilters = {
  dateRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z',
  },
  source: 'facebook' as const,
  eventType: 'ad.view',
  funnelStage: 'top' as const,
};

export const testErrors = {
  prismaError: new Error('Database connection failed'),
  validationError: new Error('Validation failed'),
  networkError: new Error('Network error'),
  reportGenerationError: new Error('Report generation failed'),
};
