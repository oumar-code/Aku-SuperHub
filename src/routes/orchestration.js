'use strict';

const { Router } = require('express');
const { validate, orchestrateRules } = require('../middleware/validate');

function createOrchestrationRouter(orchestrator) {
  const router = Router();

  // Route a request to a healthy service instance
  router.post('/', validate(orchestrateRules.route), async (req, res, next) => {
    try {
      const { serviceName, payload } = req.body;
      const result = orchestrator.route(serviceName);
      if (!result) {
        return res
          .status(503)
          .json({ error: `No healthy instance available for service: ${serviceName}` });
      }
      res.json({
        routed: true,
        service: result.service,
        payload: payload || {},
      });
    } catch (err) {
      next(err);
    }
  });

  // Get current load balancer round-robin state
  router.get('/state', (_req, res) => {
    res.json(orchestrator.getLoadBalancerState());
  });

  return router;
}

module.exports = createOrchestrationRouter;
