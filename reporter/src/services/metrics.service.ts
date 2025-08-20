import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { StructuredLogger } from '@shared/logger';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new StructuredLogger('MetricsService');
  private readonly registry: Registry;

  private readonly requestsTotal: Counter<string>;
  private readonly requestDuration: Histogram<string>;
  private readonly requestsFailed: Counter<string>;

  private readonly activeConnections: Gauge<string>;

  constructor() {
    this.registry = new Registry();

    this.requestsTotal = new Counter({
      name: 'reporter_requests_total',
      help: 'Total number of requests to the reporter',
      labelNames: ['method', 'report_type'],
      registers: [this.registry],
    });

    this.requestDuration = new Histogram({
      name: 'reporter_request_duration_seconds',
      help: 'Duration of report generation in seconds',
      labelNames: ['report_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.requestsFailed = new Counter({
      name: 'reporter_requests_failed_total',
      help: 'Total number of failed requests',
      labelNames: ['report_type', 'error'],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'reporter_active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    this.logger.log('Reporter metrics service initialized');
  }

  recordRequestStart(reportType: string, filters: any) {
    try {
      this.requestsTotal.inc({
        method: 'GET',
        report_type: reportType,
      });

      this.logger.debug('Request started', { reportType, filters });
    } catch (error) {
      this.logger.error('Failed to record request start', error.stack);
    }
  }

  recordRequestSuccess(reportType: string, duration: number, filters: any) {
    try {
      this.requestDuration.observe({ report_type: reportType }, duration / 1000);
      
      this.logger.debug('Request completed successfully', { 
        reportType, 
        duration: `${duration}ms`,
        filters 
      });
    } catch (error) {
      this.logger.error('Failed to record request success', error.stack);
    }
  }

  recordRequestFailure(reportType: string, duration: number, errorMessage: string, filters: any) {
    try {
      this.requestsFailed.inc({
        report_type: reportType,
        error: errorMessage,
      });

      this.requestDuration.observe({ report_type: reportType }, duration / 1000);
      
      this.logger.debug('Request failed', { 
        reportType, 
        duration: `${duration}ms`,
        error: errorMessage,
        filters 
      });
    } catch (error) {
      this.logger.error('Failed to record request failure', error.stack);
    }
  }

  setActiveConnections(count: number) {
    try {
      this.activeConnections.set(count);
    } catch (error) {
      this.logger.error('Failed to set active connections', error.stack);
    }
  }

  async getMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      this.logger.error('Failed to get metrics', error.stack);
      throw error;
    }
  }

  getRegistry(): Registry {
    return this.registry;
  }
}