import { Injectable, OnModuleInit } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { StructuredLogger } from '@shared/logger';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new StructuredLogger('MetricsService');
  private readonly registry: Registry;

  private readonly eventsAccepted: Counter<string>;
  private readonly eventsProcessed: Counter<string>;
  private readonly eventsFailed: Counter<string>;

  private readonly eventProcessingDuration: Histogram<string>;

  private readonly activeConnections: Gauge<string>;

  constructor() {
    this.registry = new Registry();

    this.eventsAccepted = new Counter({
      name: 'gateway_events_accepted_total',
      help: 'Total number of events accepted by the gateway',
      labelNames: ['source', 'event_type', 'funnel_stage'],
      registers: [this.registry],
    });

    this.eventsProcessed = new Counter({
      name: 'gateway_events_processed_total',
      help: 'Total number of events processed by the gateway',
      labelNames: ['source', 'event_type', 'funnel_stage'],
      registers: [this.registry],
    });

    this.eventsFailed = new Counter({
      name: 'gateway_events_failed_total',
      help: 'Total number of events that failed processing',
      labelNames: ['source', 'event_type', 'error'],
      registers: [this.registry],
    });

    this.eventProcessingDuration = new Histogram({
      name: 'gateway_event_processing_duration_seconds',
      help: 'Duration of event processing in seconds',
      labelNames: ['source', 'event_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'gateway_active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    this.logger.log('Metrics service initialized');
  }

  recordMetric(type: 'accepted' | 'processed' | 'failed', value: number, labels: Record<string, string>) {
    try {
      switch (type) {
        case 'accepted':
          this.eventsAccepted.inc(labels, value);
          break;
        case 'processed':
          this.eventsProcessed.inc(labels, value);
          break;
        case 'failed':
          this.eventsFailed.inc(labels, value);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to record metric ${type}`, error.stack);
    }
  }

  recordProcessingDuration(duration: number, labels: Record<string, string>) {
    try {
      this.eventProcessingDuration.observe(labels, duration / 1000);
    } catch (error) {
      this.logger.error('Failed to record processing duration', error.stack);
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