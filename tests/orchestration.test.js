'use strict';

const ServiceRegistry = require('../src/registry/ServiceRegistry');
const Orchestrator = require('../src/orchestration/Orchestrator');

describe('Orchestrator', () => {
  let registry;
  let orchestrator;

  beforeEach(() => {
    registry = new ServiceRegistry();
    orchestrator = new Orchestrator(registry);
  });

  const addService = (name, status = 'healthy', suffix = '') => {
    const s = registry.register({ name, url: `http://${name}${suffix}:3000`, status: 'unknown' });
    registry.updateStatus(s.id, status);
    return s;
  };

  describe('route', () => {
    it('returns null when no services registered', () => {
      expect(orchestrator.route('missing')).toBeNull();
    });

    it('routes to a healthy instance', () => {
      addService('svc-a');
      const result = orchestrator.route('svc-a');
      expect(result).not.toBeNull();
      expect(result.service.name).toBe('svc-a');
    });

    it('skips unhealthy instances', () => {
      addService('svc-b', 'unhealthy', '-1');
      addService('svc-b', 'healthy', '-2');
      const result = orchestrator.route('svc-b');
      expect(result.service.status).toBe('healthy');
    });

    it('returns null when all instances are unhealthy', () => {
      addService('svc-c', 'unhealthy', '-1');
      addService('svc-c', 'unhealthy', '-2');
      expect(orchestrator.route('svc-c')).toBeNull();
    });

    it('performs round-robin across healthy instances', () => {
      const s1 = addService('svc-d', 'healthy', '-1');
      const s2 = addService('svc-d', 'healthy', '-2');

      const r1 = orchestrator.route('svc-d');
      const r2 = orchestrator.route('svc-d');
      const r3 = orchestrator.route('svc-d');

      const ids = [r1.service.id, r2.service.id, r3.service.id];
      expect(ids).toContain(s1.id);
      expect(ids).toContain(s2.id);
      // 3rd call wraps around to first
      expect(r3.service.id).toBe(r1.service.id);
    });

    it('falls back to unknown-status instances when no healthy ones exist', () => {
      const s = registry.register({ name: 'svc-e', url: 'http://svc-e:3000' }); // status: unknown
      const result = orchestrator.route('svc-e');
      expect(result.service.id).toBe(s.id);
    });
  });

  describe('healthCheck', () => {
    it('returns unknown status for unregistered id', async () => {
      const result = await orchestrator.healthCheck('nonexistent');
      expect(result).toEqual({ id: 'nonexistent', status: 'unknown', latency: 0 });
    });

    it('marks service unhealthy on connection error', async () => {
      const s = registry.register({ name: 'dead', url: 'http://127.0.0.1:19999' });
      const result = await orchestrator.healthCheck(s.id);
      expect(result.id).toBe(s.id);
      expect(result.status).toBe('unhealthy');
      expect(typeof result.latency).toBe('number');
      expect(registry.get(s.id).status).toBe('unhealthy');
    });
  });

  describe('getLoadBalancerState', () => {
    it('returns empty object initially', () => {
      expect(orchestrator.getLoadBalancerState()).toEqual({});
    });

    it('reflects round-robin counts after routing', () => {
      addService('svc-f', 'healthy', '-1');
      addService('svc-f', 'healthy', '-2');
      orchestrator.route('svc-f');
      orchestrator.route('svc-f');
      const state = orchestrator.getLoadBalancerState();
      expect(state['svc-f']).toBe(2);
    });
  });
});
