import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilters, EventStatistics, RevenueData, DemographicsData } from '@shared/types';
import { LogMethod } from '@shared/logger';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @LogMethod()
  async generateEventStatistics(filters: ReportFilters): Promise<EventStatistics> {
    try {
      const where: any = {};
      
      if (filters.from || filters.to) {
        where.timestamp = {};
        if (filters.from) where.timestamp.gte = new Date(filters.from);
        if (filters.to) where.timestamp.lte = new Date(filters.to);
      }
      
      if (filters.source) where.source = filters.source;
      if (filters.funnelStage) where.funnelStage = filters.funnelStage;
      if (filters.eventType) where.eventType = filters.eventType;

      const totalEvents = await this.prisma.event.count({ where });

      const eventsByType = await this.prisma.event.groupBy({
        by: ['eventType'],
        where,
        _count: { eventType: true },
      });

      const eventsByFunnelStage = await this.prisma.event.groupBy({
        by: ['funnelStage'],
        where,
        _count: { funnelStage: true },
      });

      const eventsBySource = await this.prisma.event.groupBy({
        by: ['source'],
        where,
        _count: { source: true },
      });

      const eventsByTime = await this.prisma.event.groupBy({
        by: ['timestamp'],
        where,
        _count: { timestamp: true },
        orderBy: { timestamp: 'asc' },
      });

      const eventsByTypeMap: Record<string, number> = {};
      eventsByType.forEach(item => {
        eventsByTypeMap[item.eventType] = item._count.eventType;
      });

      const eventsByFunnelStageMap: Record<string, number> = {};
      eventsByFunnelStage.forEach(item => {
        eventsByFunnelStageMap[item.funnelStage] = item._count.funnelStage;
      });

      const eventsBySourceMap: Record<string, number> = {};
      eventsBySource.forEach(item => {
        eventsBySourceMap[item.source] = item._count.source;
      });

      const eventsByTimeArray = eventsByTime.map(item => ({
        timestamp: item.timestamp.toISOString(),
        count: item._count.timestamp,
      }));

      return {
        totalEvents,
        eventsByType: eventsByTypeMap,
        eventsByFunnelStage: eventsByFunnelStageMap,
        eventsBySource: eventsBySourceMap,
        eventsByTime: eventsByTimeArray,
      };
    } catch (error) {
      this.logger.error('Failed to generate event statistics', error.stack);
      throw error;
    }
  }

  @LogMethod()
  async generateRevenueData(filters: ReportFilters): Promise<RevenueData> {
    try {
      const where: any = {
          eventType: {
            in: ['checkout.complete', 'purchase'],
        },
      };
      
      if (filters.from || filters.to) {
        where.timestamp = {};
        if (filters.from) where.timestamp.gte = new Date(filters.from);
        if (filters.to) where.timestamp.lte = new Date(filters.to);
      }
      
      if (filters.source) where.source = filters.source;

      const revenueEvents = await this.prisma.event.findMany({
        where,
        select: {
          eventType: true,
          source: true,
          engagementData: true,
          timestamp: true,
        },
      });

      let totalRevenue = 0;
      const revenueBySource: Record<string, number> = {};
      const revenueByCampaign: Record<string, number> = {};
      const revenueByTime: Array<{ timestamp: string; amount: number }> = [];

      revenueEvents.forEach(event => {
        let amount = 0;
        
        if (event.eventType === 'checkout.complete' && event.source === 'facebook') {
          const engagement = event.engagementData as any;
          amount = parseFloat(engagement.purchaseAmount || '0');
        } else if (event.eventType === 'purchase' && event.source === 'tiktok') {
          const engagement = event.engagementData as any;
          amount = parseFloat(engagement.purchaseAmount || '0');
        }

        if (amount > 0) {
          totalRevenue += amount;
          
          revenueBySource[event.source] = (revenueBySource[event.source] || 0) + amount;
          
          if (event.source === 'facebook') {
            const engagement = event.engagementData as any;
            const campaignId = engagement.campaignId || 'unknown';
            revenueByCampaign[campaignId] = (revenueByCampaign[campaignId] || 0) + amount;
          }
          
          revenueByTime.push({
            timestamp: event.timestamp.toISOString(),
            amount,
          });
        }
      });

      revenueByTime.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        revenueBySource: Object.fromEntries(
          Object.entries(revenueBySource).map(([key, value]) => [key, value.toFixed(2)])
        ),
        revenueByCampaign: Object.fromEntries(
          Object.entries(revenueByCampaign).map(([key, value]) => [key, value.toFixed(2)])
        ),
        revenueByTime: revenueByTime.map(item => ({
          timestamp: item.timestamp,
          amount: item.amount.toFixed(2),
        })),
        transactionCount: revenueEvents.length,
      };
    } catch (error) {
      this.logger.error('Failed to generate revenue data', error.stack);
      throw error;
    }
  }

  @LogMethod()
  async generateDemographicsData(filters: ReportFilters): Promise<DemographicsData> {
    try {
      const where: any = {};
      
      if (filters.from || filters.to) {
        where.timestamp = {};
        if (filters.from) where.timestamp.gte = new Date(filters.from);
        if (filters.to) where.timestamp.lte = new Date(filters.to);
      }
      
      if (filters.source) where.source = filters.source;

      const result: DemographicsData = {};

      if (!filters.source || filters.source === 'facebook') {
        const facebookEvents = await this.prisma.event.findMany({
          where: { ...where, source: 'facebook' },
          select: {
            userAge: true,
            userGender: true,
            userCountry: true,
            userCity: true,
          },
        });

        const ageDistribution: Record<string, number> = {};
        facebookEvents.forEach(event => {
          if (event.userAge) {
            const ageGroup = this.getAgeGroup(event.userAge);
            ageDistribution[ageGroup] = (ageDistribution[ageGroup] || 0) + 1;
          }
        });

        const genderDistribution: Record<string, number> = {};
        facebookEvents.forEach(event => {
          if (event.userGender) {
            genderDistribution[event.userGender] = (genderDistribution[event.userGender] || 0) + 1;
          }
        });

        const locationCount: Record<string, number> = {};
        facebookEvents.forEach(event => {
          if (event.userCountry && event.userCity) {
            const location = `${event.userCountry}-${event.userCity}`;
            locationCount[location] = (locationCount[location] || 0) + 1;
          }
        });

        const topLocations = Object.entries(locationCount)
          .map(([location, count]) => {
            const [country, city] = location.split('-');
            return { country, city, count };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        result.facebook = {
          ageDistribution,
          genderDistribution,
          topLocations,
        };
      }

      if (!filters.source || filters.source === 'tiktok') {
        const tiktokEvents = await this.prisma.event.findMany({
          where: { ...where, source: 'tiktok' },
          select: {
            userFollowers: true,
            userCountry: true,
          },
        });

        const followerRanges = [
          { range: '0-1K', min: 0, max: 1000 },
          { range: '1K-10K', min: 1000, max: 10000 },
          { range: '10K-100K', min: 10000, max: 100000 },
          { range: '100K-1M', min: 100000, max: 1000000 },
          { range: '1M+', min: 1000000, max: Infinity },
        ];

        const followerDistribution = followerRanges.map(range => {
          const count = tiktokEvents.filter(event => 
            event.userFollowers && 
            event.userFollowers >= range.min && 
            event.userFollowers < range.max
          ).length;
          return { range: range.range, count };
        });

        const countryCount: Record<string, number> = {};
        tiktokEvents.forEach(event => {
          if (event.userCountry) {
            countryCount[event.userCountry] = (countryCount[event.userCountry] || 0) + 1;
          }
        });

        const topCountries = Object.entries(countryCount)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        result.tiktok = {
          followerDistribution,
          topCountries,
        };
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to generate demographics data', error.stack);
      throw error;
    }
  }

  private getAgeGroup(age: number): string {
    if (age < 18) return '13-17';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }
}

