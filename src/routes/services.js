'use strict';

const { Router } = require('express');
const { validate, serviceRules } = require('../middleware/validate');

function createServicesRouter(registry) {
  const router = Router();

  // List all services/hubs
  router.get('/', validate(serviceRules.list), (req, res) => {
    const filter = req.query.type ? { type: req.query.type } : {};
    res.json(registry.list(filter));
  });

  // Register a new service/hub
  router.post('/', validate(serviceRules.create), (req, res) => {
    const entry = registry.register(req.body);
    res.status(201).json(entry);
  });

  // Get a service/hub by ID
  router.get('/:id', validate(serviceRules.getOrDelete), (req, res) => {
    const entry = registry.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Service not found' });
    res.json(entry);
  });

  // Update a service/hub
  router.put('/:id', validate(serviceRules.update), (req, res) => {
    const updated = registry.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Service not found' });
    res.json(updated);
  });

  // Deregister a service/hub
  router.delete('/:id', validate(serviceRules.getOrDelete), (req, res) => {
    const removed = registry.deregister(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Service not found' });
    res.status(204).end();
  });

  return router;
}

module.exports = createServicesRouter;
