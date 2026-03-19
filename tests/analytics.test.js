'use strict';

const Analytics = require('../src/analytics/Analytics');

describe('Analytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = new Analytics();
  });

  describe('ingest', () => {
    it('stores an event and returns it with an id', () => {
      const event = analytics.ingest({
        serviceName: 'svc-a',
        eventType: 'request',
        latency: 100,
        success: true,
      });
      expect(event.id).toBeDefined();
      expect(event.serviceName).toBe('svc-a');
      expect(event.latency).toBe(100);
      expect(event.success).toBe(true);
    });

    it('defaults success to true and eventType to request', () => {
      const event = analytics.ingest({ serviceName: 'svc-b' });
      expect(event.success).toBe(true);
      expect(event.eventType).toBe('request');
    });

    it('assigns timestamp if not provided', () => {
      const event = analytics.ingest({ serviceName: 'svc-c' });
      expect(event.timestamp).toBeDefined();
    });

    it('respects provided timestamp', () => {
      const ts = '2024-01-01T00:00:00.000Z';
      const event = analytics.ingest({ serviceName: 'svc-d', timestamp: ts });
      expect(event.timestamp).toBe(ts);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      analytics.ingest({ serviceName: 'svc-x', latency: 50, success: true, eventType: 'request' });
      analytics.ingest({ serviceName: 'svc-x', latency: 150, success: false, eventType: 'request' });
      analytics.ingest({ serviceName: 'svc-x', latency: 200, success: true, eventType: 'error' });
    });

    it('returns total event count', () => {
      const m = analytics.getMetrics();
      expect(m.totalEvents).toBe(3);
    });

    it('calculates error rate', () => {
      const m = analytics.getMetrics();
      expect(m.errorRate).toBeCloseTo(1 / 3);
    });

    it('calculates avgLatency', () => {
      const m = analytics.getMetrics();
      expect(m.avgLatency).toBeCloseTo((50 + 150 + 200) / 3);
    });

    it('calculates p95Latency', () => {
      const m = analytics.getMetrics();
      expect(m.p95Latency).toBeGreaterThan(0);
    });

    it('groups eventsByType', () => {
      const m = analytics.getMetrics();
      expect(m.eventsByType.request).toBe(2);
      expect(m.eventsByType.error).toBe(1);
    });

    it('filters by serviceName', () => {
      analytics.ingest({ serviceName: 'other', latency: 10, success: true });
      const m = analytics.getMetrics({ serviceName: 'svc-x' });
      expect(m.totalEvents).toBe(3);
    });

    it('returns zero metrics for unknown service', () => {
      const m = analytics.getMetrics({ serviceName: 'nobody' });
      expect(m.totalEvents).toBe(0);
      expect(m.errorRate).toBe(0);
    });
  });

  describe('getMetricsForService', () => {
    it('returns service-specific metrics', () => {
      analytics.ingest({ serviceName: 'svc-y', latency: 80, success: true });
      analytics.ingest({ serviceName: 'svc-z', latency: 200, success: false });
      const m = analytics.getMetricsForService('svc-y');
      expect(m.totalEvents).toBe(1);
      expect(m.errorRate).toBe(0);
    });
  });

  describe('listEvents', () => {
    beforeEach(() => {
      for (let i = 0; i < 25; i++) {
        analytics.ingest({ serviceName: 'svc', latency: i });
      }
    });

    it('returns first page with default limit', () => {
      const result = analytics.listEvents();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.events).toHaveLength(20);
      expect(result.total).toBe(25);
    });

    it('returns second page', () => {
      const result = analytics.listEvents({ page: 2, limit: 20 });
      expect(result.events).toHaveLength(5);
    });

    it('respects custom limit', () => {
      const result = analytics.listEvents({ page: 1, limit: 5 });
      expect(result.events).toHaveLength(5);
    });
  });

  describe('event cap', () => {
    it('does not exceed MAX_EVENTS (10000)', () => {
      for (let i = 0; i < 10005; i++) {
        analytics.ingest({ serviceName: 'flood' });
      }
      const result = analytics.listEvents({ page: 1, limit: 1 });
      expect(result.total).toBeLessThanOrEqual(10000);
    });
  });
});
