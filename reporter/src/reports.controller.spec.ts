import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './services/reports.service';
import { AnalyticsService } from './services/analytics.service';
import { MetricsService } from './services/metrics.service';
import { 
  createTestModule, 
  mockLogger, 
  mockMetricsService,
  resetAllMocks 
} from './test-utils';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;
  let analyticsService: AnalyticsService;
  let metricsService: MetricsService;
  let module: TestingModule;

  const mockReportsService = {
    generateEventStatistics: jest.fn(),
    generateRevenueData: jest.fn(),
    generateDemographicsData: jest.fn(),
  };

  const mockAnalyticsService = {
    validateFilters: jest.fn(),
    generateEventStatistics: jest.fn(),
    generateRevenueReport: jest.fn(),
    generateDemographicsReport: jest.fn(),
  };

  const mockEventStatistics = {
    totalEvents: 1500,
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
    eventsByTime: [
      { timestamp: '2024-01-15T10:00:00Z', count: 150 },
      { timestamp: '2024-01-15T11:00:00Z', count: 200 },
    ],
  };

  const mockRevenueData = {
    totalRevenue: 12500.75,
    revenueBySource: {
      'facebook': '6800.25',
      'tiktok': '5700.50',
    },
    revenueByCampaign: {
      'campaign-1': '4200.00',
      'campaign-2': '3600.25',
    },
    revenueByTime: [
      { timestamp: '2024-01-15T10:00:00Z', amount: '500.00' },
      { timestamp: '2024-01-15T11:00:00Z', amount: '750.25' },
    ],
    transactionCount: 125,
  };

  const mockDemographicsData = {
    facebook: {
      ageDistribution: {
        '18-24': 250,
        '25-34': 400,
        '35-44': 300,
        '45-54': 200,
      },
      genderDistribution: {
        'male': 600,
        'female': 550,
      },
      topLocations: [
        { country: 'US', city: 'New York', count: 200 },
        { country: 'US', city: 'Los Angeles', count: 150 },
      ],
    },
    tiktok: {
      followerDistribution: [
        { range: '0-1K', count: 300 },
        { range: '1K-10K', count: 250 },
        { range: '10K-100K', count: 100 },
      ],
      topCountries: [
        { country: 'US', count: 400 },
        { country: 'UK', count: 200 },
      ],
    },
  };

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      ReportsController,
      { provide: ReportsService, useValue: mockReportsService },
      { provide: AnalyticsService, useValue: mockAnalyticsService },
      { provide: MetricsService, useValue: mockMetricsService },
    ], [], [
      ReportsController,
    ]);

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('getEventStatistics', () => {
    const mockQuery = {
      from: '2024-01-01',
      to: '2024-01-31',
      source: 'facebook',
      funnelStage: 'top',
      eventType: 'ad.view',
      campaignId: 'campaign-123',
    };

    const validatedFilters = {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-31T00:00:00.000Z',
      source: 'facebook' as const,
      funnelStage: 'top' as const,
      eventType: 'ad.view',
      campaignId: 'campaign-123',
    };

    it('should return event statistics successfully', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      mockAnalyticsService.generateEventStatistics.mockResolvedValue(mockEventStatistics);

      const result = await controller.getEventStatistics(mockQuery);

      expect(result).toEqual(mockEventStatistics);

      expect(mockAnalyticsService.validateFilters).toHaveBeenCalledWith(mockQuery);
      expect(mockAnalyticsService.generateEventStatistics).toHaveBeenCalledWith(validatedFilters);

      expect(mockMetricsService.recordRequestStart).toHaveBeenCalledWith('events', mockQuery);
      expect(mockMetricsService.recordRequestSuccess).toHaveBeenCalledWith(
        'events',
        expect.any(Number),
        mockQuery
      );

    });

    it('should handle query validation errors', async () => {
      const validationError = new Error('Invalid date range');
      mockAnalyticsService.validateFilters.mockRejectedValue(validationError);

      await expect(controller.getEventStatistics(mockQuery)).rejects.toThrow(validationError);

      expect(mockMetricsService.recordRequestStart).toHaveBeenCalledWith('events', mockQuery);
      expect(mockMetricsService.recordRequestFailure).toHaveBeenCalledWith(
        'events',
        expect.any(Number),
        validationError.message,
        mockQuery
      );
    });

    it('should handle analytics service errors', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      const analyticsError = new Error('Database connection failed');
      mockAnalyticsService.generateEventStatistics.mockRejectedValue(analyticsError);

      await expect(controller.getEventStatistics(mockQuery)).rejects.toThrow(analyticsError);

      expect(mockMetricsService.recordRequestFailure).toHaveBeenCalledWith(
        'events',
        expect.any(Number),
        analyticsError.message,
        mockQuery
      );
    });

    it('should handle empty query parameters', async () => {
      const emptyQuery = {};
      const emptyValidatedFilters = {
        from: undefined,
        to: undefined,
        source: undefined,
        funnelStage: undefined,
        eventType: undefined,
        campaignId: undefined,
      };

      mockAnalyticsService.validateFilters.mockResolvedValue(emptyValidatedFilters);
      mockAnalyticsService.generateEventStatistics.mockResolvedValue(mockEventStatistics);

      const result = await controller.getEventStatistics(emptyQuery);

      expect(result).toEqual(mockEventStatistics);
      expect(mockAnalyticsService.validateFilters).toHaveBeenCalledWith(emptyQuery);
    });

    it('should handle malformed query parameters', async () => {
      const malformedQuery = {
        from: 'invalid-date',
        source: 'invalid-source',
        funnelStage: 'invalid-stage',
      };

      await expect(controller.getEventStatistics(malformedQuery)).rejects.toThrow();
    });

    it('should measure request duration accurately', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      mockAnalyticsService.generateEventStatistics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEventStatistics), 100))
      );

      await controller.getEventStatistics(mockQuery);

      const recordedDuration = mockMetricsService.recordRequestSuccess.mock.calls[0][1];
      expect(recordedDuration).toBeGreaterThan(90);
      expect(recordedDuration).toBeLessThan(200);
    });
  });

  describe('getRevenueData', () => {
    const mockQuery = {
      from: '2024-01-01',
      to: '2024-01-31',
      source: 'facebook',
    };

    const validatedFilters = {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-31T00:00:00.000Z',
      source: 'facebook' as const,
      funnelStage: undefined,
      eventType: undefined,
      campaignId: undefined,
    };

    it('should return revenue data successfully', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      mockAnalyticsService.generateRevenueReport.mockResolvedValue(mockRevenueData);

      const result = await controller.getRevenueData(mockQuery);

      expect(result).toEqual(mockRevenueData);

      expect(mockAnalyticsService.validateFilters).toHaveBeenCalledWith(mockQuery);
      expect(mockAnalyticsService.generateRevenueReport).toHaveBeenCalledWith(validatedFilters);

      expect(mockMetricsService.recordRequestStart).toHaveBeenCalledWith('revenue', mockQuery);
      expect(mockMetricsService.recordRequestSuccess).toHaveBeenCalledWith(
        'revenue',
        expect.any(Number),
        mockQuery
      );
    });

    it('should handle revenue calculation errors', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      const revenueError = new Error('Revenue data not available');
      mockAnalyticsService.generateRevenueReport.mockRejectedValue(revenueError);

      await expect(controller.getRevenueData(mockQuery)).rejects.toThrow(revenueError);

      expect(mockMetricsService.recordRequestFailure).toHaveBeenCalledWith(
        'revenue',
        expect.any(Number),
        revenueError.message,
        mockQuery
      );
    });

    it('should handle zero revenue scenarios', async () => {
      const zeroRevenueData = {
        ...mockRevenueData,
        totalRevenue: 0,
        transactionCount: 0,
        revenueBySource: {},
        revenueByCampaign: {},
        revenueByTime: [],
      };

      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      mockAnalyticsService.generateRevenueReport.mockResolvedValue(zeroRevenueData);

      const result = await controller.getRevenueData(mockQuery);

      expect(result).toEqual(zeroRevenueData);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('getDemographicsData', () => {
    const mockQuery = {
      from: '2024-01-01',
      to: '2024-01-31',
      source: 'tiktok',
    };

    const validatedFilters = {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-31T00:00:00.000Z',
      source: 'tiktok' as const,
      funnelStage: undefined,
      eventType: undefined,
      campaignId: undefined,
    };

    it('should return demographics data successfully', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      mockAnalyticsService.generateDemographicsReport.mockResolvedValue(mockDemographicsData);

      const result = await controller.getDemographicsData(mockQuery);

      expect(result).toEqual(mockDemographicsData);

      expect(mockAnalyticsService.validateFilters).toHaveBeenCalledWith(mockQuery);
      expect(mockAnalyticsService.generateDemographicsReport).toHaveBeenCalledWith(validatedFilters);

      expect(mockMetricsService.recordRequestStart).toHaveBeenCalledWith('demographics', mockQuery);
      expect(mockMetricsService.recordRequestSuccess).toHaveBeenCalledWith(
        'demographics',
        expect.any(Number),
        mockQuery
      );

    });

    it('should handle demographics generation errors', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      const demographicsError = new Error('Demographics data unavailable');
      mockAnalyticsService.generateDemographicsReport.mockRejectedValue(demographicsError);

      await expect(controller.getDemographicsData(mockQuery)).rejects.toThrow(demographicsError);

      expect(mockMetricsService.recordRequestFailure).toHaveBeenCalledWith(
        'demographics',
        expect.any(Number),
        demographicsError.message,
        mockQuery
      );
    });

    it('should handle empty demographics data', async () => {
      const emptyDemographicsData = {};

      mockAnalyticsService.validateFilters.mockResolvedValue(validatedFilters);
      mockAnalyticsService.generateDemographicsReport.mockResolvedValue(emptyDemographicsData);

      const result = await controller.getDemographicsData(mockQuery);

      expect(result).toEqual(emptyDemographicsData);
    });

    it('should handle Facebook-only demographics data', async () => {
      const facebookOnlyData = {
        facebook: mockDemographicsData.facebook,
      };

      mockAnalyticsService.validateFilters.mockResolvedValue({ source: 'facebook' });
      mockAnalyticsService.generateDemographicsReport.mockResolvedValue(facebookOnlyData);

      const result = await controller.getDemographicsData({ source: 'facebook' });

      expect(result).toEqual(facebookOnlyData);
      expect(result.tiktok).toBeUndefined();
    });

    it('should handle TikTok-only demographics data', async () => {
      const tiktokOnlyData = {
        tiktok: mockDemographicsData.tiktok,
      };

      mockAnalyticsService.validateFilters.mockResolvedValue({ source: 'tiktok' });
      mockAnalyticsService.generateDemographicsReport.mockResolvedValue(tiktokOnlyData);

      const result = await controller.getDemographicsData({ source: 'tiktok' });

      expect(result).toEqual(tiktokOnlyData);
      expect(result.facebook).toBeUndefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle concurrent requests', async () => {
      const query1 = { source: 'facebook' };
      const query2 = { source: 'tiktok' };
      const query3 = { funnelStage: 'top' };

      mockAnalyticsService.validateFilters.mockResolvedValue({});
      mockAnalyticsService.generateEventStatistics.mockResolvedValue(mockEventStatistics);
      mockAnalyticsService.generateRevenueReport.mockResolvedValue(mockRevenueData);
      mockAnalyticsService.generateDemographicsReport.mockResolvedValue(mockDemographicsData);

      const [result1, result2, result3] = await Promise.all([
        controller.getEventStatistics(query1),
        controller.getRevenueData(query2),
        controller.getDemographicsData(query3),
      ]);

      expect(result1).toEqual(mockEventStatistics);
      expect(result2).toEqual(mockRevenueData);
      expect(result3).toEqual(mockDemographicsData);

      expect(mockMetricsService.recordRequestStart).toHaveBeenCalledTimes(3);
      expect(mockMetricsService.recordRequestSuccess).toHaveBeenCalledTimes(3);
    });

    it('should handle very large datasets', async () => {
      const largeEventStatistics = {
        ...mockEventStatistics,
        totalEvents: 1000000,
        eventsByType: Object.fromEntries(
          Array(100).fill(null).map((_, i) => [`event-type-${i}`, 10000])
        ),
      };

      mockAnalyticsService.validateFilters.mockResolvedValue({});
      mockAnalyticsService.generateEventStatistics.mockResolvedValue(largeEventStatistics);

      const result = await controller.getEventStatistics({});

      expect(result).toEqual(largeEventStatistics);
      expect(result.totalEvents).toBe(1000000);
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      mockAnalyticsService.validateFilters.mockResolvedValue({});
      mockAnalyticsService.generateEventStatistics.mockRejectedValue(timeoutError);

      await expect(controller.getEventStatistics({})).rejects.toThrow(timeoutError);

      expect(mockMetricsService.recordRequestFailure).toHaveBeenCalledWith(
        'events',
        expect.any(Number),
        'Request timeout',
        {}
      );
    });

    it('should handle partial data corruption scenarios', async () => {
      const corruptedData = {
        totalEvents: null,
        eventsByType: undefined,
        eventsByFunnelStage: {},
        eventsBySource: { facebook: 'invalid' },
        eventsByTime: [],
      };

      mockAnalyticsService.validateFilters.mockResolvedValue({});
      mockAnalyticsService.generateEventStatistics.mockResolvedValue(corruptedData as any);

      const result = await controller.getEventStatistics({});

      expect(result).toEqual(corruptedData);
    });

    it('should handle query parsing edge cases', async () => {
      const edgeCaseQuery = {
        from: '',
        to: null,
        source: undefined,
        funnelStage: 'INVALID',
        eventType: '   ',
        campaignId: 'a'.repeat(1000),
      };

      await expect(controller.getEventStatistics(edgeCaseQuery as any)).rejects.toThrow();
    });
  });

  describe('performance metrics', () => {
    it('should record accurate performance metrics for fast requests', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue({});
      mockAnalyticsService.generateEventStatistics.mockResolvedValue(mockEventStatistics);

      await controller.getEventStatistics({});

      const recordedDuration = mockMetricsService.recordRequestSuccess.mock.calls[0][1];
      expect(recordedDuration).toBeGreaterThanOrEqual(0);
      expect(recordedDuration).toBeLessThan(100);
    });

    it('should record performance metrics for slow requests', async () => {
      mockAnalyticsService.validateFilters.mockResolvedValue({});
      mockAnalyticsService.generateEventStatistics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEventStatistics), 200))
      );

      await controller.getEventStatistics({});

      const recordedDuration = mockMetricsService.recordRequestSuccess.mock.calls[0][1];
      expect(recordedDuration).toBeGreaterThan(190);
      expect(recordedDuration).toBeLessThan(300);
    });

    it('should record metrics for failed requests', async () => {
      const error = new Error('Service failure');
      mockAnalyticsService.validateFilters.mockRejectedValue(error);

      await expect(controller.getEventStatistics({})).rejects.toThrow(error);

      expect(mockMetricsService.recordRequestStart).toHaveBeenCalledWith('events', {});
      expect(mockMetricsService.recordRequestFailure).toHaveBeenCalledWith(
        'events',
        expect.any(Number),
        'Service failure',
        {}
      );

      const recordedDuration = mockMetricsService.recordRequestFailure.mock.calls[0][1];
      expect(recordedDuration).toBeGreaterThanOrEqual(0);
    });
  });
});
