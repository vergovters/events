import { Injectable } from '@nestjs/common';
import { ReportFilters, EventStatistics, RevenueData, DemographicsData } from '@shared/types';
import { StructuredLogger, LogMethod } from '@shared/logger';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsRepository {
  private readonly logger = new StructuredLogger('ReportsRepository');

  constructor(private readonly prisma: PrismaService) {}

  @LogMethod()
  async getEventStatistics(filters: ReportFilters): Promise<EventStatistics> {
    try {
      const whereClause = this.buildWhereClause(filters);

      const [totalEvents, eventsByType, eventsByFunnelStage, eventsBySource] = await Promise.all([
        this.prisma.event.count({ where: whereClause }),
        this.prisma.event.groupBy({
          by: ['eventType'],
          where: whereClause,
          _count: true,
        }),
        this.prisma.event.groupBy({
          by: ['funnelStage'],
          where: whereClause,
          _count: true,
        }),
        this.prisma.event.groupBy({
          by: ['source'],
          where: whereClause,
          _count: true,
        }),
      ]);

      const eventsByTypeMap: Record<string, number> = {};
      eventsByType.forEach(item => {
        eventsByTypeMap[item.eventType] = item._count;
      });

      const eventsByFunnelStageMap: Record<string, number> = {};
      eventsByFunnelStage.forEach(item => {
        eventsByFunnelStageMap[item.funnelStage] = item._count;
      });

      const eventsBySourceMap: Record<string, number> = {};
      eventsBySource.forEach(item => {
        eventsBySourceMap[item.source] = item._count;
      });

      const statistics: EventStatistics = {
        totalEvents,
        eventsByType: eventsByTypeMap,
        eventsByFunnelStage: eventsByFunnelStageMap,
        eventsBySource: eventsBySourceMap,
        eventsByTime: [],
      };

      this.logger.log('Event statistics retrieved', {
        totalEvents: statistics.totalEvents,
        typeCount: Object.keys(statistics.eventsByType).length,
      });

      return statistics;
    } catch (error) {
      this.logger.error('Failed to get event statistics', error.stack, { filters });
      throw error;
    }
  }

  @LogMethod()
  async getRevenueData(filters: ReportFilters): Promise<RevenueData> {
    try {
      const whereClause = this.buildWhereClause(filters);

      const events = await this.prisma.event.findMany({
        where: {
          ...whereClause,
          eventType: { in: ['purchase', 'conversion', 'checkout', 'checkout.complete'] },
        },
        select: {
          engagementData: true,
          timestamp: true,
        },
      });

      let totalRevenue = 0;
      let conversions = 0;
      const revenueByTime: { timestamp: string; amount: string }[] = [];

      events.forEach(event => {
        const revenue = this.extractRevenue(event.engagementData);
        if (revenue > 0) {
          totalRevenue += revenue;
          conversions += 1;

          revenueByTime.push({
            timestamp: event.timestamp.toISOString(),
            amount: revenue.toFixed(2),
          });
        }
      });

      const revenueData: RevenueData = {
        totalRevenue,
        revenueBySource: {},
        revenueByCampaign: {},
        revenueByTime,
        transactionCount: conversions,
      };

      this.logger.log('Revenue data retrieved', {
        totalRevenue: revenueData.totalRevenue,
        transactionCount: revenueData.transactionCount,
      });

      return revenueData;
    } catch (error) {
      this.logger.error('Failed to get revenue data', error.stack, { filters });
      throw error;
    }
  }

  @LogMethod()
  async getDemographicsData(filters: ReportFilters): Promise<DemographicsData> {
    try {
      const demographicsData: DemographicsData = {};

      if (!filters.source) {
        const facebookEvents = await this.prisma.event.findMany({
          where: { ...this.buildWhereClause({ ...filters, source: 'facebook' }) },
          select: { userData: true },
        });

        const tiktokEvents = await this.prisma.event.findMany({
          where: { ...this.buildWhereClause({ ...filters, source: 'tiktok' }) },
          select: { userData: true },
        });

        if (facebookEvents.length > 0) {
          demographicsData.facebook = this.processFacebookDemographics(facebookEvents);
        }

        if (tiktokEvents.length > 0) {
          demographicsData.tiktok = this.processTiktokDemographics(tiktokEvents);
        }
      } else {
        const whereClause = this.buildWhereClause(filters);
        const events = await this.prisma.event.findMany({
          where: whereClause,
          select: { userData: true },
        });

        if (filters.source === 'facebook') {
          demographicsData.facebook = this.processFacebookDemographics(events);
        } else if (filters.source === 'tiktok') {
          demographicsData.tiktok = this.processTiktokDemographics(events);
        }
      }

      this.logger.log('Demographics data retrieved', {
        platforms: Object.keys(demographicsData).length,
      });

      return demographicsData;
    } catch (error) {
      this.logger.error('Failed to get demographics data', error.stack, { filters });
      throw error;
    }
  }

  private processFacebookDemographics(events: any[]) {
    const ageGroups = new Map<string, number>();
    const genderCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();

    events.forEach(event => {
      const userData = event.userData as any;
      if (!userData) return;

      if (userData.age) {
        const ageGroup = this.getAgeGroup(userData.age);
        ageGroups.set(ageGroup, (ageGroups.get(ageGroup) || 0) + 1);
      }

      if (userData.gender) {
        genderCounts.set(userData.gender, (genderCounts.get(userData.gender) || 0) + 1);
      }

      if (userData.location?.country) {
        locationCounts.set(userData.location.country, (locationCounts.get(userData.location.country) || 0) + 1);
      }
    });

    return {
      ageDistribution: Object.fromEntries(ageGroups),
      genderDistribution: Object.fromEntries(genderCounts),
      topLocations: Array.from(locationCounts.entries())
        .map(([location, count]) => ({ country: location, city: '', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  private processTiktokDemographics(events: any[]) {
    const followerCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();

    events.forEach(event => {
      const userData = event.userData as any;
      if (!userData) return;

      if (userData.followers) {
        const range = this.getFollowerRange(userData.followers);
        followerCounts.set(range, (followerCounts.get(range) || 0) + 1);
      }

      if (userData.location?.country) {
        locationCounts.set(userData.location.country, (locationCounts.get(userData.location.country) || 0) + 1);
      }
    });

    return {
      followerDistribution: [
        { range: '0-1K', count: followerCounts.get('0-1K') || 0 },
        { range: '1K-10K', count: followerCounts.get('1K-10K') || 0 },
        { range: '10K-100K', count: followerCounts.get('10K-100K') || 0 },
        { range: '100K-1M', count: followerCounts.get('100K-1M') || 0 },
        { range: '1M+', count: followerCounts.get('1M+') || 0 },
      ],
      topCountries: Array.from(locationCounts.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  private buildWhereClause(filters: ReportFilters): any {
    const where: any = {};

    if (filters.dateRange?.start || filters.dateRange?.end || filters.from || filters.to) {
      where.timestamp = {};
      const startDate = filters.dateRange?.start || filters.from;
      const endDate = filters.dateRange?.end || filters.to;
      
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.funnelStage) {
      where.funnelStage = filters.funnelStage;
    }

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    return where;
  }

  private calculateConversionRate(eventsByStage: any[]): number {
    const topEvents = eventsByStage.find(item => item.funnelStage === 'top')?._count || 0;
    const bottomEvents = eventsByStage.find(item => item.funnelStage === 'bottom')?._count || 0;
    
    return topEvents > 0 ? (bottomEvents / topEvents) * 100 : 0;
  }

  private extractRevenue(engagementData: any): number {
    try {
      if (engagementData && typeof engagementData === 'object') {
        return parseFloat(engagementData.revenue || engagementData.value || engagementData.amount || engagementData.purchaseAmount || 0);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private getAgeGroup(age: number): string {
    if (age < 18) return '< 18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  private getFollowerRange(followers: number): string {
    if (followers < 1000) return '0-1K';
    if (followers < 10000) return '1K-10K';
    if (followers < 100000) return '10K-100K';
    if (followers < 1000000) return '100K-1M';
    return '1M+';
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed', error.stack);
      return false;
    }
  }
}
