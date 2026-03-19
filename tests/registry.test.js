'use strict';

const ServiceRegistry = require('../src/registry/ServiceRegistry');

describe('ServiceRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  describe('register', () => {
    it('creates a new entry with generated id', () => {
      const entry = registry.register({ name: 'svc-a', url: 'http://svc-a:3000' });
      expect(entry.id).toBeDefined();
      expect(entry.name).toBe('svc-a');
      expect(entry.type).toBe('service');
      expect(entry.status).toBe('unknown');
      expect(entry.createdAt).toBeDefined();
      expect(entry.updatedAt).toBeDefined();
    });

    it('respects provided type', () => {
      const entry = registry.register({ name: 'hub-a', type: 'hub', url: 'http://hub-a:4000' });
      expect(entry.type).toBe('hub');
    });

    it('stores metadata', () => {
      const entry = registry.register({
        name: 'svc-b',
        url: 'http://svc-b',
        metadata: { region: 'us-east' },
      });
      expect(entry.metadata.region).toBe('us-east');
    });
  });

  describe('get', () => {
    it('returns the entry by id', () => {
      const created = registry.register({ name: 'svc', url: 'http://svc' });
      const fetched = registry.get(created.id);
      expect(fetched).toEqual(created);
    });

    it('returns null for unknown id', () => {
      expect(registry.get('nonexistent')).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      registry.register({ name: 'svc-1', type: 'service', url: 'http://svc-1' });
      registry.register({ name: 'hub-1', type: 'hub', url: 'http://hub-1' });
      registry.register({ name: 'svc-2', type: 'service', url: 'http://svc-2' });
    });

    it('lists all entries without filter', () => {
      expect(registry.list()).toHaveLength(3);
    });

    it('filters by type=service', () => {
      const services = registry.list({ type: 'service' });
      expect(services).toHaveLength(2);
      services.forEach((s) => expect(s.type).toBe('service'));
    });

    it('filters by type=hub', () => {
      const hubs = registry.list({ type: 'hub' });
      expect(hubs).toHaveLength(1);
      expect(hubs[0].type).toBe('hub');
    });
  });

  describe('update', () => {
    it('updates fields', () => {
      jest.useFakeTimers();
      const created = registry.register({ name: 'svc', url: 'http://old' });
      jest.advanceTimersByTime(1000);
      const updated = registry.update(created.id, { url: 'http://new' });
      jest.useRealTimers();
      expect(updated.url).toBe('http://new');
      expect(updated.name).toBe('svc');
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('returns null for unknown id', () => {
      expect(registry.update('missing', { url: 'x' })).toBeNull();
    });

    it('preserves createdAt', () => {
      const created = registry.register({ name: 'svc', url: 'http://svc' });
      const updated = registry.update(created.id, { name: 'renamed' });
      expect(updated.createdAt).toBe(created.createdAt);
    });
  });

  describe('deregister', () => {
    it('removes the entry', () => {
      const created = registry.register({ name: 'svc', url: 'http://svc' });
      expect(registry.deregister(created.id)).toBe(true);
      expect(registry.get(created.id)).toBeNull();
    });

    it('returns false for unknown id', () => {
      expect(registry.deregister('missing')).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('changes the status', () => {
      const created = registry.register({ name: 'svc', url: 'http://svc' });
      const result = registry.updateStatus(created.id, 'healthy');
      expect(result.status).toBe('healthy');
    });

    it('returns null for unknown id', () => {
      expect(registry.updateStatus('missing', 'healthy')).toBeNull();
    });
  });
});
