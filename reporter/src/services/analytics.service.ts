import { Injectable } from '@nestjs/common';
import { ReportFilters, EventStatistics, RevenueData, DemographicsData } from '@shared/types';
import { StructuredLogger, LogMethod } from '@shared/logger';
import { ReportsRepository } from '../repositories/reports.repository';

@Injectable()
export class AnalyticsService {
  private readonly logger = new StructuredLogger('AnalyticsService');

  constructor(private readonly reportsRepository: ReportsRepository) {}

  @LogMethod()
  async generateEventStatistics(filters: ReportFilters): Promise<EventStatistics> {
    try {
      this.logger.log('Generating event statistics', { filters });

      const statistics = await this.reportsRepository.getEventStatistics(filters);
      
      this.logger.log('Event statistics generated successfully', {
        totalEvents: statistics.totalEvents,
        typeCount: Object.keys(statistics.eventsByType).length,
      });

      return statistics;
    } catch (error) {
      this.logger.error('Failed to generate event statistics', error.stack, { filters });
      throw error;
    }
  }

  @LogMethod()
  async generateRevenueReport(filters: ReportFilters): Promise<RevenueData> {
    try {
      this.logger.log('Generating revenue report', { filters });

      const revenueData = await this.reportsRepository.getRevenueData(filters);
      
      this.logger.log('Revenue report generated successfully', {
        totalRevenue: revenueData.totalRevenue,
        transactionCount: revenueData.transactionCount,
      });

      return revenueData;
    } catch (error) {
      this.logger.error('Failed to generate revenue report', error.stack, { filters });
      throw error;
    }
  }

  @LogMethod()
  async generateDemographicsReport(filters: ReportFilters): Promise<DemographicsData> {
    try {
      this.logger.log('Generating demographics report', { filters });

      const demographicsData = await this.reportsRepository.getDemographicsData(filters);
      
      this.logger.log('Demographics report generated successfully', {
        platforms: Object.keys(demographicsData).length,
      });

      return demographicsData;
    } catch (error) {
      this.logger.error('Failed to generate demographics report', error.stack, { filters });
      throw error;
    }
  }

  @LogMethod()
  async validateFilters(filters: ReportFilters): Promise<ReportFilters> {
    try {
      const validatedFilters: ReportFilters = {
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(filters.to).toISOString() : undefined,
        source: filters.source,
        funnelStage: filters.funnelStage,
        eventType: filters.eventType,
        campaignId: filters.campaignId,
      };

      if (validatedFilters.from && validatedFilters.to && 
          new Date(validatedFilters.from) > new Date(validatedFilters.to)) {
        throw new Error('From date cannot be later than to date');
      }

      this.logger.log('Filters validated successfully', { validatedFilters });
      return validatedFilters;
    } catch (error) {
      this.logger.error('Filter validation failed', error.stack, { filters });
      throw error;
    }
  }
}
