import { TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { ReportsRepository } from '../repositories/reports.repository';
import { 
  createTestModule, 
  resetAllMocks,
  mockReportFilters 
} from '../test-utils';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let reportsRepository: ReportsRepository;
  let module: TestingModule;

  const mockReportsRepository = {
    getEventStatistics: jest.fn(),
    getRevenueData: jest.fn(),
    getDemographicsData: jest.fn(),
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
      AnalyticsService,
      { provide: ReportsRepository, useValue: mockReportsRepository },
    ]);

    service = module.get<AnalyticsService>(AnalyticsService);
    reportsRepository = module.get<ReportsRepository>(ReportsRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('generateEventStatistics', () => {
    it('should generate event statistics successfully', async () => {
      mockReportsRepository.getEventStatistics.mockResolvedValue(mockEventStatistics);

      const result = await service.generateEventStatistics(mockReportFilters);

      expect(result).toEqual(mockEventStatistics);
      expect(mockReportsRepository.getEventStatistics).toHaveBeenCalledWith(mockReportFilters);
    });

    it('should handle event statistics generation errors', async () => {
      const error = new Error('Database connection failed');
      mockReportsRepository.getEventStatistics.mockRejectedValue(error);

      await expect(service.generateEventStatistics(mockReportFilters)).rejects.toThrow(error);
    });

    it('should handle empty filters', async () => {
      const emptyFilters = {};
      mockReportsRepository.getEventStatistics.mockResolvedValue(mockEventStatistics);

      const result = await service.generateEventStatistics(emptyFilters);

      expect(result).toEqual(mockEventStatistics);
      expect(mockReportsRepository.getEventStatistics).toHaveBeenCalledWith(emptyFilters);
    });

    it('should handle statistics with zero events', async () => {
      const emptyStats = {
        totalEvents: 0,
        eventsByType: {},
        eventsByFunnelStage: {},
        eventsBySource: {},
        eventsByTime: [],
      };

      mockReportsRepository.getEventStatistics.mockResolvedValue(emptyStats);

      const result = await service.generateEventStatistics(mockReportFilters);

      expect(result).toEqual(emptyStats);
    });
  });

  describe('generateRevenueReport', () => {
    it('should generate revenue report successfully', async () => {
      mockReportsRepository.getRevenueData.mockResolvedValue(mockRevenueData);

      const result = await service.generateRevenueReport(mockReportFilters);

      expect(result).toEqual(mockRevenueData);
      expect(mockReportsRepository.getRevenueData).toHaveBeenCalledWith(mockReportFilters);

    });

    it('should handle revenue report generation errors', async () => {
      const error = new Error('Revenue calculation failed');
      mockReportsRepository.getRevenueData.mockRejectedValue(error);

      await expect(service.generateRevenueReport(mockReportFilters)).rejects.toThrow(error);
    });

    it('should handle revenue data with zero revenue', async () => {
      const zeroRevenueData = {
        ...mockRevenueData,
        totalRevenue: 0,
        transactionCount: 0,
        revenueBySource: {},
        revenueByCampaign: {},
        revenueByTime: [],
      };

      mockReportsRepository.getRevenueData.mockResolvedValue(zeroRevenueData);

      const result = await service.generateRevenueReport(mockReportFilters);

      expect(result).toEqual(zeroRevenueData);
    });

    it('should handle date range filters for revenue', async () => {
      const dateRangeFilters = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
      };

      mockReportsRepository.getRevenueData.mockResolvedValue(mockRevenueData);

      const result = await service.generateRevenueReport(dateRangeFilters);

      expect(result).toEqual(mockRevenueData);
      expect(mockReportsRepository.getRevenueData).toHaveBeenCalledWith(dateRangeFilters);
    });
  });

  describe('generateDemographicsReport', () => {
    it('should generate demographics report successfully', async () => {
      mockReportsRepository.getDemographicsData.mockResolvedValue(mockDemographicsData);

      const result = await service.generateDemographicsReport(mockReportFilters);

      expect(result).toEqual(mockDemographicsData);
      expect(mockReportsRepository.getDemographicsData).toHaveBeenCalledWith(mockReportFilters);
    });

    it('should handle demographics report generation errors', async () => {
      const error = new Error('Demographics data unavailable');
      mockReportsRepository.getDemographicsData.mockRejectedValue(error);

      await expect(service.generateDemographicsReport(mockReportFilters)).rejects.toThrow(error);
    });

    it('should handle demographics data with only Facebook data', async () => {
      const facebookOnlyData = {
        facebook: mockDemographicsData.facebook,
      };

      mockReportsRepository.getDemographicsData.mockResolvedValue(facebookOnlyData);

      const result = await service.generateDemographicsReport({ source: 'facebook' });

      expect(result).toEqual(facebookOnlyData);
      expect(result.tiktok).toBeUndefined();
    });

    it('should handle demographics data with only TikTok data', async () => {
      const tiktokOnlyData = {
        tiktok: mockDemographicsData.tiktok,
      };

      mockReportsRepository.getDemographicsData.mockResolvedValue(tiktokOnlyData);

      const result = await service.generateDemographicsReport({ source: 'tiktok' });

      expect(result).toEqual(tiktokOnlyData);
      expect(result.facebook).toBeUndefined();
    });

    it('should handle empty demographics data', async () => {
      const emptyDemographicsData = {};

      mockReportsRepository.getDemographicsData.mockResolvedValue(emptyDemographicsData);

      const result = await service.generateDemographicsReport(mockReportFilters);

      expect(result).toEqual(emptyDemographicsData);
    });
  });

  describe('validateFilters', () => {
    it('should validate and sanitize filters successfully', async () => {
      const inputFilters = {
        from: '2024-01-01',
        to: '2024-01-31',
        source: 'facebook' as const,
        funnelStage: 'top' as const,
        eventType: 'ad.view',
        campaignId: 'campaign-123',
      };

      const result = await service.validateFilters(inputFilters);

      expect(result).toEqual({
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-01-31T00:00:00.000Z',
        source: 'facebook',
        funnelStage: 'top',
        eventType: 'ad.view',
        campaignId: 'campaign-123',
      });
    });

    it('should handle filters without dates', async () => {
      const filtersWithoutDates = {
        source: 'tiktok' as const,
        eventType: 'video.view',
      };

      const result = await service.validateFilters(filtersWithoutDates);

      expect(result).toEqual({
        from: undefined,
        to: undefined,
        source: 'tiktok',
        funnelStage: undefined,
        eventType: 'video.view',
        campaignId: undefined,
      });
    });

    it('should reject filters where from date is after to date', async () => {
      const invalidFilters = {
        from: '2024-01-31',
        to: '2024-01-01',
      };

      await expect(service.validateFilters(invalidFilters)).rejects.toThrow(
        'From date cannot be later than to date'
      );
    });

    it('should handle invalid date formats gracefully', async () => {
      const invalidDateFilters = {
        from: 'invalid-date',
        to: '2024-01-31',
      };

      await expect(service.validateFilters(invalidDateFilters)).rejects.toThrow();  
    });

    it('should handle empty filters', async () => {
      const emptyFilters = {};

      const result = await service.validateFilters(emptyFilters);

      expect(result).toEqual({
        from: undefined,
        to: undefined,
        source: undefined,
        funnelStage: undefined,
        eventType: undefined,
        campaignId: undefined,
      });
    });

    it('should handle edge case where from and to dates are the same', async () => {
      const sameDateFilters = {
        from: '2024-01-15',
        to: '2024-01-15',
      };

      const result = await service.validateFilters(sameDateFilters);

      expect(result.from).toBe(result.to);
      expect(new Date(result.from!)).toEqual(new Date(result.to!));
    });
  });

  describe('integration scenarios', () => {
    it('should generate complete analytics report with all data types', async () => {
      mockReportsRepository.getEventStatistics.mockResolvedValue(mockEventStatistics);
      mockReportsRepository.getRevenueData.mockResolvedValue(mockRevenueData);
      mockReportsRepository.getDemographicsData.mockResolvedValue(mockDemographicsData);

      const validatedFilters = await service.validateFilters(mockReportFilters);

      const [eventStats, revenueData, demographicsData] = await Promise.all([
        service.generateEventStatistics(validatedFilters),
        service.generateRevenueReport(validatedFilters),
        service.generateDemographicsReport(validatedFilters),
      ]);

      expect(eventStats).toEqual(mockEventStatistics);
      expect(revenueData).toEqual(mockRevenueData);
      expect(demographicsData).toEqual(mockDemographicsData);

      expect(mockReportsRepository.getEventStatistics).toHaveBeenCalledWith(validatedFilters);
      expect(mockReportsRepository.getRevenueData).toHaveBeenCalledWith(validatedFilters);
      expect(mockReportsRepository.getDemographicsData).toHaveBeenCalledWith(validatedFilters);
    });

    it('should handle concurrent report generation', async () => {
      mockReportsRepository.getEventStatistics.mockClear();
      mockReportsRepository.getRevenueData.mockClear();
      
      mockReportsRepository.getEventStatistics.mockResolvedValue(mockEventStatistics);
      mockReportsRepository.getRevenueData.mockResolvedValue(mockRevenueData);

      const promises = Array(5).fill(null).map(() => Promise.all([
        service.generateEventStatistics(mockReportFilters),
        service.generateRevenueReport(mockReportFilters),
      ]));

      const results = await Promise.all(promises);

      results.forEach(([eventStats, revenueData]) => {
        expect(eventStats).toEqual(mockEventStatistics);
        expect(revenueData).toEqual(mockRevenueData);
      });

      expect(mockReportsRepository.getEventStatistics).toHaveBeenCalledTimes(5);
      expect(mockReportsRepository.getRevenueData).toHaveBeenCalledTimes(5);
    });

    it('should handle partial failures in concurrent operations', async () => {
      mockReportsRepository.getEventStatistics.mockResolvedValue(mockEventStatistics);
      mockReportsRepository.getRevenueData.mockRejectedValue(new Error('Revenue service down'));
      mockReportsRepository.getDemographicsData.mockResolvedValue(mockDemographicsData);

      const results = await Promise.allSettled([
        service.generateEventStatistics(mockReportFilters),
        service.generateRevenueReport(mockReportFilters),
        service.generateDemographicsReport(mockReportFilters),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toEqual(mockEventStatistics);
      }
      if (results[2].status === 'fulfilled') {
        expect(results[2].value).toEqual(mockDemographicsData);
      }
    });
  });
});
