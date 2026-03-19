'use strict';

const { body, param, query, validationResult } = require('express-validator');

function validate(rules) {
  return async (req, res, next) => {
    await Promise.all(rules.map((r) => r.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
  };
}

const serviceRules = {
  create: [
    body('name').isString().notEmpty().withMessage('name is required'),
    body('type').optional().isIn(['service', 'hub']).withMessage('type must be service or hub'),
    body('url').isURL({ require_tld: false }).withMessage('url must be a valid URL'),
    body('metadata').optional().isObject(),
  ],
  update: [
    param('id').isUUID().withMessage('id must be a UUID'),
    body('name').optional().isString().notEmpty(),
    body('type').optional().isIn(['service', 'hub']),
    body('url').optional().isURL({ require_tld: false }),
    body('status').optional().isIn(['healthy', 'unhealthy', 'unknown']),
    body('metadata').optional().isObject(),
  ],
  getOrDelete: [param('id').isUUID().withMessage('id must be a UUID')],
  list: [query('type').optional().isIn(['service', 'hub'])],
};

const orchestrateRules = {
  route: [
    body('serviceName').isString().notEmpty().withMessage('serviceName is required'),
    body('payload').optional().isObject(),
  ],
};

const analyticsRules = {
  ingest: [
    body('serviceName').isString().notEmpty().withMessage('serviceName is required'),
    body('eventType').optional().isString(),
    body('latency').optional().isNumeric(),
    body('success').optional().isBoolean(),
    body('metadata').optional().isObject(),
  ],
  listEvents: [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
};

module.exports = { validate, serviceRules, orchestrateRules, analyticsRules };
