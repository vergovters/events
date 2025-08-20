import { Test, TestingModule } from '@nestjs/testing';
import { ReportsRepository } from './reports.repository';
import { PrismaService } from '../prisma/prisma.service';
import { 
  createTestModule, 
  mockLogger, 
  mockPrismaService,
  resetAllMocks,
  mockReportFilters,
  testErrors
} from '../test-utils';

describe('ReportsRepository', () => {
  let repository: ReportsRepository;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      ReportsRepository,
      { provide: PrismaService, useValue: mockPrismaService },
    ]);

    repository = module.get<ReportsRepository>(ReportsRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('getEventStatistics', () => {
    const mockCountResult = 1500;
    const mockEventsByType = [
      { eventType: 'ad.view', _count: 600 },
      { eventType: 'video.view', _count: 500 },
      { eventType: 'purchase', _count: 400 },
    ];
    const mockEventsByFunnelStage = [
      { funnelStage: 'top', _count: 1000 },
      { funnelStage: 'bottom', _count: 500 },
    ];
    const mockEventsBySource = [
      { source: 'facebook', _count: 800 },
      { source: 'tiktok', _count: 700 },
    ];

    beforeEach(() => {
      mockPrismaService.event.count.mockResolvedValue(mockCountResult);
      mockPrismaService.event.groupBy
        .mockResolvedValueOnce(mockEventsByType)
        .mockResolvedValueOnce(mockEventsByFunnelStage)
        .mockResolvedValueOnce(mockEventsBySource);
    });

    it('should get event statistics successfully', async () => {
      const result = await repository.getEventStatistics(mockReportFilters);

      expect(result).toEqual({
        totalEvents: mockCountResult,
        eventsByType: {
          'ad.view': 600,
          'video.view': 500,
          'purchase': 400,
        },
        eventsByFunnelStage: {
          'top': 1000,
          'bottom': 500,
        },
        eventsBySource: {
          'facebook': 800,
          'tiktok': 700,
        },
        eventsByTime: [],
      });

      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          timestamp: {
            gte: new Date(mockReportFilters.dateRange.start),
            lte: new Date(mockReportFilters.dateRange.end),
          },
          source: mockReportFilters.source,
          funnelStage: mockReportFilters.funnelStage,
          eventType: mockReportFilters.eventType,
        }),
      });

      expect(mockPrismaService.event.groupBy).toHaveBeenCalledWith({
        by: ['eventType'],
        where: expect.any(Object),
        _count: true,
      });

    });

    it('should handle filters without date range', async () => {
      const filtersWithoutDates = {
        source: 'facebook' as const,
        eventType: 'ad.view',
      };

      await repository.getEventStatistics(filtersWithoutDates);

      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: expect.not.objectContaining({
          timestamp: expect.any(Object),
        }),
      });
    });

    it('should handle filters with only from date', async () => {
      const filtersWithFromOnly = {
        from: '2024-01-01T00:00:00Z',
        source: 'tiktok' as const,
      };

      await repository.getEventStatistics(filtersWithFromOnly);

      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          timestamp: {
            gte: new Date(filtersWithFromOnly.from),
          },
        }),
      });
    });

    it('should handle filters with only to date', async () => {
      const filtersWithToOnly = {
        to: '2024-01-31T23:59:59Z',
        funnelStage: 'bottom' as const,
      };

      await repository.getEventStatistics(filtersWithToOnly);

      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          timestamp: {
            lte: new Date(filtersWithToOnly.to),
          },
        }),
      });
    });

    it('should handle empty filters', async () => {
      await repository.getEventStatistics({});

      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: {},
      });
    });

    it('should handle database errors', async () => {
      mockPrismaService.event.count.mockRejectedValue(testErrors.prismaError);

      await expect(repository.getEventStatistics(mockReportFilters)).rejects.toThrow(testErrors.prismaError);
    });
  });

  describe('getRevenueData', () => {
    const mockRevenueEvents = [
      {
        eventType: 'checkout.complete',
        source: 'facebook',
        engagementData: { purchaseAmount: '49.99', campaignId: 'camp-1' },
        timestamp: new Date('2024-01-15T10:00:00Z'),
      },
      {
        eventType: 'purchase',
        source: 'tiktok',
        engagementData: { purchaseAmount: '29.99' },
        timestamp: new Date('2024-01-15T11:00:00Z'),
      },
      {
        eventType: 'checkout.complete',
        source: 'facebook',
        engagementData: { purchaseAmount: '79.99', campaignId: 'camp-2' },
        timestamp: new Date('2024-01-15T12:00:00Z'),
      },
    ];

    beforeEach(() => {
      mockPrismaService.event.findMany.mockResolvedValue(mockRevenueEvents);
    });

    it('should get revenue data successfully', async () => {
      const result = await repository.getRevenueData(mockReportFilters);

      expect(result).toEqual({
        totalRevenue: 159.97,
        revenueBySource: {},
        revenueByCampaign: {},
        revenueByTime: [
          { timestamp: '2024-01-15T10:00:00.000Z', amount: '49.99' },
          { timestamp: '2024-01-15T11:00:00.000Z', amount: '29.99' },
          { timestamp: '2024-01-15T12:00:00.000Z', amount: '79.99' },
        ],
        transactionCount: 3,
      });

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          eventType: { in: ['purchase', 'conversion', 'checkout', 'checkout.complete'] },
          timestamp: {
            gte: new Date(mockReportFilters.dateRange.start),
            lte: new Date(mockReportFilters.dateRange.end),
          },
          source: mockReportFilters.source,
        }),
        select: {
          engagementData: true,
          timestamp: true,
        },
      });
    });

    it('should handle revenue events with missing purchase amounts', async () => {
      const eventsWithMissingAmounts = [
        {
          eventType: 'checkout.complete',
          source: 'facebook',
          engagementData: { campaignId: 'camp-1' },
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        {
          eventType: 'purchase',
          source: 'tiktok',
          engagementData: { purchaseAmount: '25.00' },
          timestamp: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      mockPrismaService.event.findMany.mockResolvedValue(eventsWithMissingAmounts);

      const result = await repository.getRevenueData(mockReportFilters);

      expect(result.totalRevenue).toBe(25.00);
      expect(result.transactionCount).toBe(1);
    });

    it('should handle events with invalid purchase amounts', async () => {
      const eventsWithInvalidAmounts = [
        {
          eventType: 'checkout.complete',
          source: 'facebook',
          engagementData: { purchaseAmount: 'invalid' },
          timestamp: new Date('2024-01-15T10:00:00Z'),
        },
        {
          eventType: 'purchase',
          source: 'tiktok',
          engagementData: { purchaseAmount: '30.00' },
          timestamp: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      mockPrismaService.event.findMany.mockResolvedValue(eventsWithInvalidAmounts);

      const result = await repository.getRevenueData(mockReportFilters);

      expect(result.totalRevenue).toBe(30.00);
      expect(result.transactionCount).toBe(1);
    });

    it('should handle source-specific filtering', async () => {
      const facebookFilters = { source: 'facebook' as const };

      await repository.getRevenueData(facebookFilters);

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          source: 'facebook',
        }),
        select: expect.any(Object),
      });
    });

    it('should handle empty revenue results', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const result = await repository.getRevenueData(mockReportFilters);

      expect(result).toEqual({
        totalRevenue: 0,
        revenueBySource: {},
        revenueByCampaign: {},
        revenueByTime: [],
        transactionCount: 0,
      });
    });

    it('should handle database errors during revenue calculation', async () => {
      mockPrismaService.event.findMany.mockRejectedValue(testErrors.prismaError);

      await expect(repository.getRevenueData(mockReportFilters)).rejects.toThrow(testErrors.prismaError);
    });
  });

  describe('getDemographicsData', () => {
    const mockFacebookEvents = [
      {
        userData: {
          age: 25,
          gender: 'male',
          location: { country: 'US', city: 'New York' },
        },
      },
      {
        userData: {
          age: 32,
          gender: 'female',
          location: { country: 'US', city: 'Los Angeles' },
        },
      },
      {
        userData: {
          age: 28,
          gender: 'male',
          location: { country: 'UK', city: 'London' },
        },
      },
    ];

    const mockTiktokEvents = [
      {
        userData: {
          followers: 500,
          location: { country: 'US' },
        },
      },
      {
        userData: {
          followers: 15000,
          location: { country: 'UK' },
        },
      },
      {
        userData: {
          followers: 250000,
          location: { country: 'US' },
        },
      },
    ];

    it('should get demographics data for Facebook successfully', async () => {
      const facebookFilters = { source: 'facebook' as const };
      mockPrismaService.event.findMany.mockResolvedValue(mockFacebookEvents);

      const result = await repository.getDemographicsData(facebookFilters);

      expect(result).toEqual({
        facebook: {
          ageDistribution: {
            '25-34': 3,
          },
          genderDistribution: {
            'male': 2,
            'female': 1,
          },
          topLocations: [
            { country: 'US', city: '', count: 2 },
            { country: 'UK', city: '', count: 1 },
          ],
        },
      });

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          source: 'facebook',
        }),
        select: {
          userData: true,
        },
      });
    });

    it('should get demographics data for both platforms when no source filter', async () => {
      mockPrismaService.event.findMany
        .mockResolvedValueOnce(mockFacebookEvents)
        .mockResolvedValueOnce(mockTiktokEvents);

      const result = await repository.getDemographicsData({});

      expect(result).toHaveProperty('facebook');
      expect(result).toHaveProperty('tiktok');
      expect(mockPrismaService.event.findMany).toHaveBeenCalledTimes(2);
    });

    it('should handle empty demographics results', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const result = await repository.getDemographicsData({ source: 'facebook' });

      expect(result).toEqual({
        facebook: {
          ageDistribution: {},
          genderDistribution: {},
          topLocations: [],
        },
      });
    });
    it('should handle database errors during demographics calculation', async () => {
      mockPrismaService.event.findMany.mockRejectedValue(testErrors.prismaError);

      await expect(repository.getDemographicsData(mockReportFilters)).rejects.toThrow(testErrors.prismaError);
    });
  });

  describe('getAgeGroup', () => {
    it('should categorize ages correctly', () => {
      const repo = repository as any;

      expect(repo.getAgeGroup(15)).toBe('< 18');
      expect(repo.getAgeGroup(20)).toBe('18-24');
      expect(repo.getAgeGroup(30)).toBe('25-34');
      expect(repo.getAgeGroup(40)).toBe('35-44');
      expect(repo.getAgeGroup(50)).toBe('45-54');
      expect(repo.getAgeGroup(60)).toBe('55-64');
      expect(repo.getAgeGroup(70)).toBe('65+');
    });

    it('should handle edge cases', () => {
      const repo = repository as any;

      expect(repo.getAgeGroup(13)).toBe('< 18');
      expect(repo.getAgeGroup(17)).toBe('< 18');
      expect(repo.getAgeGroup(18)).toBe('18-24');
      expect(repo.getAgeGroup(24)).toBe('18-24');
      expect(repo.getAgeGroup(25)).toBe('25-34');
      expect(repo.getAgeGroup(65)).toBe('65+');
      expect(repo.getAgeGroup(100)).toBe('65+');
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return true when database is connected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const result = await repository.checkDatabaseConnection();

      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith`SELECT 1`;
    });

    it('should return false when database connection fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(testErrors.prismaError);

      const result = await repository.checkDatabaseConnection();

      expect(result).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle concurrent data requests', async () => {
      mockPrismaService.event.count.mockResolvedValue(1000);
      mockPrismaService.event.groupBy.mockResolvedValue([]);
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const [eventStats, revenueData, demographicsData] = await Promise.all([
        repository.getEventStatistics(mockReportFilters),
        repository.getRevenueData(mockReportFilters),
        repository.getDemographicsData(mockReportFilters),
      ]);

      expect(eventStats.totalEvents).toBe(1000);
      expect(revenueData.totalRevenue).toBe(0);
      expect(demographicsData).toBeDefined();
    });

    it('should handle complex filter combinations', async () => {
      const complexFilters = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
        source: 'facebook' as const,
        funnelStage: 'bottom' as const,
        eventType: 'checkout.complete',
      };

      mockPrismaService.event.count.mockResolvedValue(250);
      mockPrismaService.event.groupBy.mockResolvedValue([]);
      mockPrismaService.event.findMany.mockResolvedValue([]);

      await repository.getEventStatistics(complexFilters);

      expect(mockPrismaService.event.count).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: new Date(complexFilters.from),
            lte: new Date(complexFilters.to),
          },
          source: complexFilters.source,
          funnelStage: complexFilters.funnelStage,
          eventType: complexFilters.eventType,
        },
      });
    });
  });
});
