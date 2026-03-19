'use strict';

const http = require('http');
const https = require('https');

class Orchestrator {
  constructor(registry) {
    this._registry = registry;
    // Map<serviceName, roundRobinIndex>
    this._rrIndex = new Map();
  }

  /**
   * Pick a healthy instance for serviceName using round-robin.
   * @param {string} serviceName
   * @returns {{ service: object, instance: object } | null}
   */
  route(serviceName) {
    const candidates = this._registry
      .list()
      .filter((s) => s.name === serviceName && s.status === 'healthy');

    if (candidates.length === 0) {
      // Fall back to any instance with unknown status
      const fallback = this._registry
        .list()
        .filter((s) => s.name === serviceName && s.status !== 'unhealthy');
      if (fallback.length === 0) return null;
      return this._pick(serviceName, fallback);
    }

    return this._pick(serviceName, candidates);
  }

  _pick(serviceName, candidates) {
    const idx = (this._rrIndex.get(serviceName) || 0) % candidates.length;
    this._rrIndex.set(serviceName, idx + 1);
    const instance = candidates[idx];
    return { service: instance, instance };
  }

  /**
   * Perform a basic HTTP/HTTPS GET health check against the instance URL.
   * @param {string} id - service id
   * @returns {Promise<{ id: string, status: string, latency: number }>}
   */
  healthCheck(id) {
    const service = this._registry.get(id);
    if (!service) {
      return Promise.resolve({ id, status: 'unknown', latency: 0 });
    }

    const start = Date.now();
    const lib = service.url && service.url.startsWith('https') ? https : http;

    return new Promise((resolve) => {
      try {
        const req = lib.get(service.url, (res) => {
          const latency = Date.now() - start;
          const status = res.statusCode < 400 ? 'healthy' : 'unhealthy';
          this._registry.updateStatus(id, status);
          resolve({ id, status, latency });
        });
        req.on('error', () => {
          const latency = Date.now() - start;
          this._registry.updateStatus(id, 'unhealthy');
          resolve({ id, status: 'unhealthy', latency });
        });
        req.setTimeout(5000, () => {
          req.destroy();
          const latency = Date.now() - start;
          this._registry.updateStatus(id, 'unhealthy');
          resolve({ id, status: 'unhealthy', latency });
        });
      } catch (_err) {
        this._registry.updateStatus(id, 'unhealthy');
        resolve({ id, status: 'unhealthy', latency: Date.now() - start });
      }
    });
  }

  getLoadBalancerState() {
    const state = {};
    for (const [name, idx] of this._rrIndex.entries()) {
      state[name] = idx;
    }
    return state;
  }
}

module.exports = Orchestrator;
