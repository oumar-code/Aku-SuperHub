'use strict';

const request = require('supertest');
const createApp = require('../src/app');

describe('HTTP Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  // ── Health ──────────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // ── 404 ─────────────────────────────────────────────────────────────────────

  describe('Unknown routes', () => {
    it('returns 404', async () => {
      const res = await request(app).get('/not-a-real-path');
      expect(res.status).toBe(404);
    });
  });

  // ── Services ────────────────────────────────────────────────────────────────

  describe('POST /api/services', () => {
    it('creates a service', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({ name: 'my-svc', type: 'service', url: 'http://my-svc:3000' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('my-svc');
    });

    it('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({ url: 'http://svc' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing url', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({ name: 'svc' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid type', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({ name: 'svc', url: 'http://svc', type: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/services', () => {
    it('lists all services', async () => {
      await request(app).post('/api/services').send({ name: 's1', url: 'http://s1' });
      await request(app).post('/api/services').send({ name: 's2', url: 'http://s2' });
      const res = await request(app).get('/api/services');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by type', async () => {
      await request(app).post('/api/services').send({ name: 'svc', type: 'service', url: 'http://svc' });
      await request(app).post('/api/services').send({ name: 'hub', type: 'hub', url: 'http://hub' });
      const res = await request(app).get('/api/services?type=hub');
      expect(res.status).toBe(200);
      res.body.forEach((e) => expect(e.type).toBe('hub'));
    });

    it('returns 400 for invalid type filter', async () => {
      const res = await request(app).get('/api/services?type=bad');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/services/:id', () => {
    it('returns the service', async () => {
      const created = (
        await request(app).post('/api/services').send({ name: 'svc', url: 'http://svc' })
      ).body;
      const res = await request(app).get(`/api/services/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
    });

    it('returns 404 for missing id', async () => {
      const res = await request(app).get('/api/services/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });

    it('returns 400 for non-UUID id', async () => {
      const res = await request(app).get('/api/services/not-a-uuid');
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/services/:id', () => {
    it('updates a service', async () => {
      const created = (
        await request(app).post('/api/services').send({ name: 'svc', url: 'http://old' })
      ).body;
      const res = await request(app)
        .put(`/api/services/${created.id}`)
        .send({ url: 'http://new' });
      expect(res.status).toBe(200);
      expect(res.body.url).toBe('http://new');
    });

    it('returns 404 for missing id', async () => {
      const res = await request(app)
        .put('/api/services/00000000-0000-0000-0000-000000000000')
        .send({ name: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/services/:id', () => {
    it('deletes a service', async () => {
      const created = (
        await request(app).post('/api/services').send({ name: 'svc', url: 'http://svc' })
      ).body;
      const res = await request(app).delete(`/api/services/${created.id}`);
      expect(res.status).toBe(204);
    });

    it('returns 404 for missing id', async () => {
      const res = await request(app).delete('/api/services/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  // ── Orchestration ───────────────────────────────────────────────────────────

  describe('POST /api/orchestrate', () => {
    it('routes to a service with unknown status (fallback)', async () => {
      await request(app)
        .post('/api/services')
        .send({ name: 'target', url: 'http://target:3000' });

      const res = await request(app)
        .post('/api/orchestrate')
        .send({ serviceName: 'target', payload: { key: 'val' } });
      expect(res.status).toBe(200);
      expect(res.body.routed).toBe(true);
      expect(res.body.service.name).toBe('target');
    });

    it('returns 503 when no healthy instances', async () => {
      const res = await request(app)
        .post('/api/orchestrate')
        .send({ serviceName: 'nonexistent' });
      expect(res.status).toBe(503);
    });

    it('returns 400 for missing serviceName', async () => {
      const res = await request(app).post('/api/orchestrate').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orchestrate/state', () => {
    it('returns load balancer state', async () => {
      const res = await request(app).get('/api/orchestrate/state');
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
    });
  });

  // ── Analytics ───────────────────────────────────────────────────────────────

  describe('POST /api/analytics/events', () => {
    it('ingests an event', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({ serviceName: 'svc', eventType: 'request', latency: 42, success: true });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
    });

    it('returns 400 for missing serviceName', async () => {
      const res = await request(app).post('/api/analytics/events').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/analytics/metrics', () => {
    it('returns global metrics', async () => {
      await request(app)
        .post('/api/analytics/events')
        .send({ serviceName: 'svc', latency: 50 });
      const res = await request(app).get('/api/analytics/metrics');
      expect(res.status).toBe(200);
      expect(typeof res.body.totalEvents).toBe('number');
    });

    it('filters metrics by serviceName', async () => {
      await request(app)
        .post('/api/analytics/events')
        .send({ serviceName: 'filtered-svc', latency: 99 });
      const res = await request(app).get('/api/analytics/metrics?serviceName=filtered-svc');
      expect(res.status).toBe(200);
      expect(res.body.totalEvents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/analytics/events', () => {
    it('returns paginated events', async () => {
      await request(app)
        .post('/api/analytics/events')
        .send({ serviceName: 'svc' });
      const res = await request(app).get('/api/analytics/events?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.page).toBe(1);
    });

    it('returns 400 for invalid page', async () => {
      const res = await request(app).get('/api/analytics/events?page=0');
      expect(res.status).toBe(400);
    });
  });
});
