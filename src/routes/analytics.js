'use strict';

const { Router } = require('express');
const { validate, analyticsRules } = require('../middleware/validate');

function createAnalyticsRouter(analytics) {
  const router = Router();

  // Ingest an event
  router.post('/events', validate(analyticsRules.ingest), (req, res) => {
    const stored = analytics.ingest(req.body);
    res.status(201).json(stored);
  });

  // Get aggregated metrics (optional ?serviceName= filter)
  router.get('/metrics', (req, res) => {
    const filter = req.query.serviceName ? { serviceName: req.query.serviceName } : {};
    res.json(analytics.getMetrics(filter));
  });

  // List recent events with pagination
  router.get('/events', validate(analyticsRules.listEvents), (req, res) => {
    const result = analytics.listEvents({
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  });

  return router;
}

module.exports = createAnalyticsRouter;
