import { Controller, Get, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ReportsService } from './services/reports.service';
import { AnalyticsService } from './services/analytics.service';
import { MetricsService } from './services/metrics.service';
import { ReportFilters, EventStatistics, RevenueData, DemographicsData } from '@shared/types';
import { LogMethod } from '@shared/logger';
import { z } from 'zod';

const ReportFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  source: z.enum(['facebook', 'tiktok']).optional(),
  funnelStage: z.enum(['top', 'bottom']).optional(),
  eventType: z.string().optional(),
  campaignId: z.string().optional(),
});

@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly analyticsService: AnalyticsService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('events')
  @HttpCode(HttpStatus.OK)
  @LogMethod()
  async getEventStatistics(@Query() query: any): Promise<EventStatistics> {
    const startTime = Date.now();
    
    try {
      const filters = ReportFiltersSchema.parse(query);
      
      this.metricsService.recordRequestStart('events', filters);
      
      const validatedFilters = await this.analyticsService.validateFilters(filters);
      const result = await this.analyticsService.generateEventStatistics(validatedFilters);
      
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestSuccess('events', duration, filters);
      
      this.logger.log(`Event statistics report generated successfully`, {
        filters,
        duration: `${duration}ms`,
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestFailure('events', duration, error.message, query);
      
      this.logger.error(`Failed to generate event statistics report`, error.stack, {
        query,
        duration: `${duration}ms`,
      });
      
      throw error;
    }
  }

  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @LogMethod()
  async getRevenueData(@Query() query: any): Promise<RevenueData> {
    const startTime = Date.now();
    
    try {
      const filters = ReportFiltersSchema.parse(query);
      
      this.metricsService.recordRequestStart('revenue', filters);
      
      const validatedFilters = await this.analyticsService.validateFilters(filters);
      const result = await this.analyticsService.generateRevenueReport(validatedFilters);
      
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestSuccess('revenue', duration, filters);
      
      this.logger.log(`Revenue report generated successfully`, {
        filters,
        duration: `${duration}ms`,
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestFailure('revenue', duration, error.message, query);
      
      this.logger.error(`Failed to generate revenue report`, error.stack, {
        query,
        duration: `${duration}ms`,
      });
      
      throw error;
    }
  }

  @Get('demographics')
  @HttpCode(HttpStatus.OK)
  @LogMethod()
  async getDemographicsData(@Query() query: any): Promise<DemographicsData> {
    const startTime = Date.now();
    
    try {
      const filters = ReportFiltersSchema.parse(query);
      
      this.metricsService.recordRequestStart('demographics', filters);
      
      const validatedFilters = await this.analyticsService.validateFilters(filters);
      const result = await this.analyticsService.generateDemographicsReport(validatedFilters);
      
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestSuccess('demographics', duration, filters);
      
      this.logger.log(`Demographics report generated successfully`, {
        filters,
        duration: `${duration}ms`,
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsService.recordRequestFailure('demographics', duration, error.message, query);
      
      this.logger.error(`Failed to generate demographics report`, error.stack, {
        query,
        duration: `${duration}ms`,
      });
        
      throw error;
    }
  }
}

