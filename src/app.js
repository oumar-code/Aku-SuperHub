'use strict';

const express = require('express');
const ServiceRegistry = require('./registry/ServiceRegistry');
const Orchestrator = require('./orchestration/Orchestrator');
const Analytics = require('./analytics/Analytics');
const createServicesRouter = require('./routes/services');
const createOrchestrationRouter = require('./routes/orchestration');
const createAnalyticsRouter = require('./routes/analytics');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.use(express.json());

  // Instantiate core components
  const registry = new ServiceRegistry();
  const orchestrator = new Orchestrator(registry);
  const analytics = new Analytics();

  // Mount routes
  app.use('/api/services', createServicesRouter(registry));
  app.use('/api/orchestrate', createOrchestrationRouter(orchestrator));
  app.use('/api/analytics', createAnalyticsRouter(analytics));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
