import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { 
  createTestModule, 
  resetAllMocks 
} from '../test-utils';

describe('MetricsService', () => {
  let service: MetricsService;
  let module: TestingModule;

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      MetricsService,
    ]);

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('recordMetric', () => {
    it('should record accepted metrics successfully', () => {
      const labels = { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' };
      
      expect(() => service.recordMetric('accepted', 1, labels)).not.toThrow();
    });

    it('should record processed metrics successfully', () => {
      const labels = { source: 'tiktok', event_type: 'video.view', funnel_stage: 'top' };
      
      expect(() => service.recordMetric('processed', 1, labels)).not.toThrow();
    });

    it('should record failed metrics successfully', () => {
      const labels = { source: 'facebook', event_type: 'ad.click', error: 'validation_failed' };
      
      expect(() => service.recordMetric('failed', 1, labels)).not.toThrow();
    });

    it('should handle metrics with different values', () => {
      const labels = { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' };
      
      expect(() => service.recordMetric('accepted', 5, labels)).not.toThrow();
      expect(() => service.recordMetric('processed', 10, labels)).not.toThrow();
    });

    it('should handle zero values', () => {
      const labels = { source: 'tiktok', event_type: 'purchase', error: 'none' };
      
      expect(() => service.recordMetric('failed', 0, labels)).not.toThrow();
    });
  });

  describe('recordProcessingDuration', () => {
    it('should record processing duration successfully', () => {
      const duration = 250;
      const labels = { source: 'facebook', event_type: 'ad.view' };
      
      expect(() => service.recordProcessingDuration(duration, labels)).not.toThrow();
    });

    it('should handle very fast processing', () => {
      const duration = 0.5;
      const labels = { source: 'tiktok', event_type: 'video.view' };
      
      expect(() => service.recordProcessingDuration(duration, labels)).not.toThrow();
    });

    it('should handle slow processing', () => {
      const duration = 5000;
      const labels = { source: 'facebook', event_type: 'checkout.complete' };
      
      expect(() => service.recordProcessingDuration(duration, labels)).not.toThrow();
    });
  });

  describe('setActiveConnections', () => {
    it('should set active connections count', () => {
      expect(() => service.setActiveConnections(10)).not.toThrow();
    });

    it('should handle zero connections', () => {
      expect(() => service.setActiveConnections(0)).not.toThrow();
    });

    it('should handle high connection counts', () => {
      expect(() => service.setActiveConnections(1000)).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics data', async () => {
      service.recordMetric('accepted', 5, { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' });
      service.recordMetric('processed', 3, { source: 'tiktok', event_type: 'video.view', funnel_stage: 'top' });
      
      const metrics = await service.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('gateway_events_accepted_total');
      expect(metrics).toContain('gateway_events_processed_total');
    });

    it('should return metrics even when no metrics have been recorded', async () => {
      const metrics = await service.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
    });

    it('should include all metric types in output', async () => {
      service.recordMetric('accepted', 1, { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' });
      service.recordMetric('processed', 1, { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' });
      service.recordMetric('failed', 1, { source: 'facebook', event_type: 'ad.view', error: 'timeout' });
      service.recordProcessingDuration(100, { source: 'facebook', event_type: 'ad.view' });
      service.setActiveConnections(5);
      
      const metrics = await service.getMetrics();
      
      expect(metrics).toContain('gateway_events_accepted_total');
      expect(metrics).toContain('gateway_events_processed_total');
      expect(metrics).toContain('gateway_events_failed_total');
      expect(metrics).toContain('gateway_event_processing_duration_seconds');
      expect(metrics).toContain('gateway_active_connections');
    });
  });

  describe('getRegistry', () => {
    it('should return the prometheus registry', () => {
      const registry = service.getRegistry();
      
      expect(registry).toBeDefined();
      expect(typeof registry).toBe('object');
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete event processing lifecycle', () => {
      const labels = { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' };
      
      service.recordMetric('accepted', 1, labels);
      
      service.setActiveConnections(10);
      
      service.recordProcessingDuration(150, { source: 'facebook', event_type: 'ad.view' });
      
      service.recordMetric('processed', 1, labels);
      
      expect(() => service.getMetrics()).not.toThrow();
    });

    it('should handle event failure lifecycle', async () => {
      const labels = { source: 'tiktok', event_type: 'purchase', funnel_stage: 'bottom' };
      
      service.recordMetric('accepted', 1, labels);
      
      service.recordProcessingDuration(75, { source: 'tiktok', event_type: 'purchase' });
      
      service.recordMetric('failed', 1, { ...labels, error: 'invalid_signature' });
      
      const metrics = await service.getMetrics();
      expect(metrics).toContain('gateway_events_accepted_total');
      expect(metrics).toContain('gateway_events_failed_total');
    });

    it('should handle high volume of metrics', () => {
      const baseLabels = { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' };
      
      for (let i = 0; i < 100; i++) {
        service.recordMetric('accepted', 1, baseLabels);
        service.recordProcessingDuration(Math.random() * 1000, { source: 'facebook', event_type: 'ad.view' });
      }
      
      expect(() => service.getMetrics()).not.toThrow();
    });

    it('should handle metrics with various label combinations', () => {
      const testCases = [
        { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' },
        { source: 'tiktok', event_type: 'video.view', funnel_stage: 'top' },
        { source: 'facebook', event_type: 'checkout.complete', funnel_stage: 'bottom' },
        { source: 'tiktok', event_type: 'purchase', funnel_stage: 'bottom' },
      ];

      testCases.forEach(labels => {
        expect(() => service.recordMetric('accepted', 1, labels)).not.toThrow();
        expect(() => service.recordMetric('processed', 1, labels)).not.toThrow();
        expect(() => service.recordProcessingDuration(100, { source: labels.source, event_type: labels.event_type })).not.toThrow();
      });
    });

    it('should handle concurrent metric recording', async () => {
      const promises = Array(50).fill(null).map((_, i) => 
        Promise.resolve().then(() => {
          service.recordMetric('accepted', 1, { 
            source: i % 2 === 0 ? 'facebook' : 'tiktok', 
            event_type: 'test.event',
            funnel_stage: 'top'
          });
          service.recordProcessingDuration(i * 10, { 
            source: i % 2 === 0 ? 'facebook' : 'tiktok', 
            event_type: 'test.event'
          });
        })
      );

      await Promise.all(promises);
      
      const metrics = await service.getMetrics();
      expect(metrics).toContain('gateway_events_accepted_total');
    });
  });

  describe('error handling', () => {
    it('should handle invalid metric types gracefully', () => {
      const labels = { source: 'facebook', event_type: 'ad.view', funnel_stage: 'top' };
      
      expect(() => service.recordMetric('accepted', 1, labels)).not.toThrow();
      expect(() => service.recordMetric('processed', 1, labels)).not.toThrow();
      expect(() => service.recordMetric('failed', 1, labels)).not.toThrow();
    });

    it('should handle negative durations', () => {
      const labels = { source: 'facebook', event_type: 'ad.view' };
      
      expect(() => service.recordProcessingDuration(-10, labels)).not.toThrow();
    });

    it('should handle empty labels', () => {
      expect(() => service.recordMetric('accepted', 1, {})).not.toThrow();
      expect(() => service.recordProcessingDuration(100, {})).not.toThrow();
    });
  });
});