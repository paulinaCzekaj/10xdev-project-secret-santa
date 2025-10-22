# CI/CD Pipeline Documentation

## Overview

This CI/CD pipeline is designed for the Secret Santa application built with Astro 5, React 19, TypeScript 5, and Supabase. The pipeline ensures code quality, runs comprehensive tests, and builds production-ready Docker images.

## Pipeline Structure

The pipeline consists of 4 sequential jobs that run on Ubuntu latest with Node.js 20:

### 1. Lint & Type Check
- **Purpose**: Ensures code quality and type safety
- **Steps**:
  - Code checkout
  - Node.js setup with npm caching
  - Dependencies installation
  - ESLint code linting
  - TypeScript type checking

### 2. Unit Tests
- **Purpose**: Validates business logic with Vitest
- **Steps**:
  - Code checkout
  - Node.js setup
  - Dependencies installation
  - Unit tests with coverage reporting (70% threshold)
  - Coverage report upload

### 3. E2E Tests
- **Purpose**: Validates user flows with Playwright
- **Steps**:
  - Code checkout
  - Node.js setup
  - Dependencies installation
  - Playwright browser setup (Chromium)
  - End-to-end tests execution
  - Test results upload

### 4. Build & Deploy
- **Purpose**: Creates production build and Docker image
- **Steps**:
  - Code checkout
  - Node.js setup
  - Dependencies installation
  - Astro production build
  - Docker image build and push (optional)
  - Docker image testing
  - DigitalOcean deployment (optional)

## Triggers

The pipeline runs automatically on:
- **Push to master branch**
- **Manual trigger** via GitHub Actions UI

## Required Secrets

Configure these secrets in your GitHub repository settings:

### For Supabase (Testing)
```
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### For Docker Hub (Optional)
```
DOCKERHUB_USERNAME=your_dockerhub_username
DOCKERHUB_TOKEN=your_dockerhub_access_token
```

### For DigitalOcean (Optional)
```
DIGITALOCEAN_ACCESS_TOKEN=your_digitalocean_token
```

## Local Development Setup

To run the same checks locally:

```bash
# Install dependencies
npm ci

# Lint and type check
npm run lint
npx tsc --noEmit

# Run unit tests
npm run test:coverage

# Run E2E tests (requires running app)
npm run dev:e2e  # Terminal 1
npm run test:e2e  # Terminal 2

# Build production
npm run build
```

## Docker Testing

The pipeline includes automated Docker image testing:

1. Builds the image locally
2. Runs the container on port 3000
3. Waits for the application to start (up to 60 seconds)
4. Performs health check on the root endpoint
5. Cleans up the container

## Performance Optimizations

- **Caching**: Node.js dependencies are cached between runs
- **Parallelization**: Jobs run sequentially only when necessary
- **Docker Layer Caching**: Uses GitHub Actions cache for Docker builds
- **Conditional Deployment**: Only builds/deploy when on master or manual trigger

## Monitoring & Debugging

### Test Results
- Unit test coverage reports are uploaded as artifacts
- E2E test results and screenshots are uploaded as artifacts
- Playwright HTML reports are available for detailed test analysis

### Failure Handling
- Tests are retried on CI (2 retries configured)
- Failed tests capture screenshots and traces
- All artifacts are preserved even on failures

## Deployment Options

### Docker Hub
When Docker Hub credentials are provided, the pipeline will:
- Build and tag the image with commit SHA
- Push to Docker Hub with `latest` tag
- Use build caching for faster subsequent builds

### DigitalOcean
When DigitalOcean token is provided, you can add deployment commands in the final step. Example:

```yaml
- name: Deploy to DigitalOcean
  run: |
    doctl apps update your-app-id --spec app-spec.yml
  env:
    DIGITALOCEAN_ACCESS_TOKEN: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

## Environment Variables

The pipeline uses these environment variables:

- `NODE_VERSION`: Node.js version (20)
- `DOCKER_IMAGE`: Base name for Docker images (secret-santa-app)

## Cost Optimization

- Jobs run only on master branch pushes and manual triggers
- Docker images are only pushed when credentials are available
- Test results are uploaded as artifacts for review
- No unnecessary parallel jobs to avoid GitHub Actions minute limits