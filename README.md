# Super Hub

## Overview
Super Hub is a microservice in the Aku platform ecosystem. It provides advanced orchestration, analytics, and management for all connected services and hubs.

## Features
- REST API for orchestration and analytics
- Scalable Node.js backend

## Getting Started

### Prerequisites
- Node.js 20+
- Docker (optional)

### Development
```bash
git clone <repo-url>
cd SuperHub
npm install
npm run dev
```

### Docker
```bash
docker build -t super-hub:latest .
docker run -p 8080:8080 super-hub:latest
```

### Testing
```bash
npm test
```

## Deployment
See `.github/workflows/ci.yml` for CI/CD pipeline.

## License
MIT
