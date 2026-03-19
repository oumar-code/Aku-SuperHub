'use strict';

const { v4: uuidv4 } = require('uuid');

class ServiceRegistry {
  constructor() {
    this._store = new Map();
  }

  register(data) {
    const id = uuidv4();
    const now = new Date().toISOString();
    const entry = {
      id,
      name: data.name,
      type: data.type || 'service',
      url: data.url,
      status: data.status || 'unknown',
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
    this._store.set(id, entry);
    return { ...entry };
  }

  update(id, data) {
    const entry = this._store.get(id);
    if (!entry) return null;
    const updated = {
      ...entry,
      ...data,
      id,
      createdAt: entry.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this._store.set(id, updated);
    return { ...updated };
  }

  deregister(id) {
    return this._store.delete(id);
  }

  get(id) {
    const entry = this._store.get(id);
    return entry ? { ...entry } : null;
  }

  list(filter = {}) {
    const entries = Array.from(this._store.values()).map((e) => ({ ...e }));
    if (filter.type) {
      return entries.filter((e) => e.type === filter.type);
    }
    return entries;
  }

  updateStatus(id, status) {
    const entry = this._store.get(id);
    if (!entry) return null;
    entry.status = status;
    entry.updatedAt = new Date().toISOString();
    this._store.set(id, entry);
    return { ...entry };
  }
}

module.exports = ServiceRegistry;
