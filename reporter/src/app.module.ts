import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { HealthController } from './health.controller';
import { MetricsService } from './services/metrics.service';
import { ReportsService } from './services/reports.service';
import { StructuredLogger } from '@shared/logger';
import { AnalyticsService } from './services/analytics.service';
import { ReportsRepository } from './repositories/reports.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TerminusModule,
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  controllers: [ReportsController, HealthController],
  providers: [
    MetricsService,
    StructuredLogger,
    ReportsService,
    AnalyticsService,
    ReportsRepository,
  ],
})
export class AppModule {}

