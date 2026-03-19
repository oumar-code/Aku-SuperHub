'use strict';

const { v4: uuidv4 } = require('uuid');

const MAX_EVENTS = 10000;

class Analytics {
  constructor() {
    this._events = [];
    // Map<serviceName, aggregateObject>
    this._aggregates = new Map();
  }

  ingest(event) {
    const stored = {
      id: uuidv4(),
      serviceId: event.serviceId || null,
      serviceName: event.serviceName || 'unknown',
      eventType: event.eventType || 'request',
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: event.metadata || {},
      latency: typeof event.latency === 'number' ? event.latency : null,
      success: event.success !== undefined ? Boolean(event.success) : true,
    };

    if (this._events.length >= MAX_EVENTS) {
      this._events.shift();
    }
    this._events.push(stored);
    this._updateAggregates(stored);
    return { ...stored };
  }

  _updateAggregates(event) {
    const name = event.serviceName;
    if (!this._aggregates.has(name)) {
      this._aggregates.set(name, {
        totalEvents: 0,
        errors: 0,
        latencies: [],
        eventsByType: {},
      });
    }
    const agg = this._aggregates.get(name);
    agg.totalEvents += 1;
    if (!event.success) agg.errors += 1;
    if (event.latency !== null) agg.latencies.push(event.latency);
    agg.eventsByType[event.eventType] =
      (agg.eventsByType[event.eventType] || 0) + 1;
  }

  _computeMetrics(agg) {
    if (!agg) {
      return {
        totalEvents: 0,
        errorRate: 0,
        avgLatency: 0,
        p95Latency: 0,
        eventsByType: {},
      };
    }
    const { totalEvents, errors, latencies, eventsByType } = agg;
    const errorRate = totalEvents > 0 ? errors / totalEvents : 0;
    const sorted = [...latencies].sort((a, b) => a - b);
    const avgLatency =
      sorted.length > 0
        ? sorted.reduce((s, v) => s + v, 0) / sorted.length
        : 0;
    const p95Latency =
      sorted.length > 0
        ? sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1]
        : 0;
    return { totalEvents, errorRate, avgLatency, p95Latency, eventsByType };
  }

  getMetrics(filter = {}) {
    if (filter.serviceName) {
      return this.getMetricsForService(filter.serviceName);
    }
    // Global aggregation
    const global = { totalEvents: 0, errors: 0, latencies: [], eventsByType: {} };
    for (const agg of this._aggregates.values()) {
      global.totalEvents += agg.totalEvents;
      global.errors += agg.errors;
      global.latencies.push(...agg.latencies);
      for (const [type, count] of Object.entries(agg.eventsByType)) {
        global.eventsByType[type] = (global.eventsByType[type] || 0) + count;
      }
    }
    return this._computeMetrics(global);
  }

  getMetricsForService(serviceName) {
    return this._computeMetrics(this._aggregates.get(serviceName));
  }

  listEvents(options = {}) {
    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
    const start = (page - 1) * limit;
    const slice = this._events.slice(start, start + limit);
    return {
      page,
      limit,
      total: this._events.length,
      events: slice.map((e) => ({ ...e })),
    };
  }
}

module.exports = Analytics;
