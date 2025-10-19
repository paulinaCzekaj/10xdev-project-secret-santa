# GitHub Secrets Setup Guide

This guide explains how to configure secrets for the CI/CD pipeline.

## Required Secrets

### 1. Supabase Configuration (Required for E2E tests)
```
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
```

**How to get these values:**
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key

### 2. Docker Hub (Optional - for container deployment)
```
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

**How to get Docker Hub token:**
1. Go to [Docker Hub](https://hub.docker.com)
2. Login to your account
3. Go to Account Settings → Security → Access Tokens
4. Generate a new access token

### 3. DigitalOcean (Optional - for cloud deployment)
```
DIGITALOCEAN_ACCESS_TOKEN
```

**How to get DigitalOcean token:**
1. Go to [DigitalOcean Dashboard](https://cloud.digitalocean.com)
2. Go to API → Tokens/Keys
3. Generate a new Personal Access Token

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with its name and value
6. Click "Add secret"

## Testing the Setup

After adding secrets, trigger a manual workflow run:

1. Go to the "Actions" tab in your repository
2. Click on "CI/CD Pipeline" workflow
3. Click "Run workflow" button
4. Select the master branch and click "Run workflow"

## Troubleshooting

### If E2E tests fail:
- Check that Supabase secrets are correctly set
- Ensure the Supabase project allows connections from GitHub Actions IPs
- Verify the test database is properly configured

### If Docker push fails:
- Verify Docker Hub credentials are correct
- Check that the Docker Hub account has write permissions
- Ensure the repository name in the workflow matches your setup

### If deployment fails:
- Check DigitalOcean token permissions
- Verify the deployment commands in the workflow are correct for your setup

## Security Notes

- Never commit secrets directly to the repository
- Use different Supabase projects for testing and production
- Rotate tokens regularly
- Use the principle of least privilege for all tokens
