# Environment Configuration Guide

This document explains how to manage different environment configurations in the Secret Santa project.

## Table of Contents

- [Overview](#overview)
- [Environment Files](#environment-files)
- [Setup Guide](#setup-guide)
- [Switching Between Environments](#switching-between-environments)
- [Production Backup](#production-backup)
- [Troubleshooting](#troubleshooting)

---

## Overview

This project uses **Cloudflare Pages** adapter with Astro, which requires two types of environment files:

1. **`.env` files** - Used by Vite/Astro build system (accessible via `import.meta.env`)
2. **`.dev.vars` file** - Used by Cloudflare platformProxy for local runtime (accessible via `locals.runtime.env`)

### Environment Variable Prefixes

- **`PUBLIC_*`** - Exposed to client-side code (browser). Required for Astro client components.
- **Non-PUBLIC** - Server-side only. Used in API endpoints and server components.

---

## Environment Files

### 📁 `.env` - Local Development (Default)

**Purpose**: Your main development environment with local Supabase.

**When to use**: Daily development work, testing features locally.

**Configuration**:

```env
# Server-side Supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Client-side Supabase (PUBLIC_ prefix required!)
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Other variables
PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_ACCESS_TOKEN=sbp_...
OPENROUTER_API_KEY=sk-or-v1-...
```

**Important**: Both `SUPABASE_URL` and `PUBLIC_SUPABASE_URL` must point to the same database!

---

### 📁 `.dev.vars` - Cloudflare PlatformProxy Runtime

**Purpose**: Environment variables for Cloudflare Workers runtime in local development.

**When to use**: Automatically used by `npm run dev` for API endpoints.

**Configuration**:

```env
OPENROUTER_API_KEY=sk-or-v1-...
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note**: These variables are accessed via `locals.runtime.env` in API endpoints.

---

### 📁 `.env.test` - E2E Testing Environment

**Purpose**: Environment for Playwright E2E tests.

**When to use**: Running `npm run test:e2e` or `npm run dev:e2e`.

**Configuration**:

```env
# Local Supabase for safe testing
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test user credentials
E2E_USERNAME_ID=...
E2E_USERNAME=test@example.com
E2E_PASSWORD=...

SUPABASE_ACCESS_TOKEN=sbp_...
```

**Warning**: Never point `.env.test` to production! Tests should run against local Supabase only.

---

### 📁 `.env.production` - Production Template

**Purpose**: Template showing production environment variables.

**When to use**: Reference for setting up Cloudflare Pages environment variables.

**Configuration**:

```env
# Production Supabase
SUPABASE_URL=https://uiyurwyzsckkkoqthxmv.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Client-side (PUBLIC_ prefix)
PUBLIC_SUPABASE_URL=https://uiyurwyzsckkkoqthxmv.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Production site URL
PUBLIC_SITE_URL=https://your-app.pages.dev

# API Keys (replace placeholders)
SUPABASE_ACCESS_TOKEN=###_REPLACE_WITH_YOUR_TOKEN_###
OPENROUTER_API_KEY=###_REPLACE_WITH_YOUR_KEY_###
```

**Important**:

- This file is NOT used directly in development
- Copy values to Cloudflare Pages dashboard: `Settings → Environment variables`
- Never commit real production secrets to git!

---

## Setup Guide

### First-Time Setup

1. **Copy environment template**:

   ```bash
   cp .env.example .env
   cp .env.example .dev.vars
   ```

2. **Update `.env` with local Supabase credentials**:

   ```bash
   # Make sure both URLs are local
   SUPABASE_URL=http://127.0.0.1:54321
   PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   ```

3. **Start local Supabase**:

   ```bash
   supabase start
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Setting Up E2E Tests

1. **Create test user in local Supabase**:
   - Open Supabase Studio: http://127.0.0.1:54323
   - Create a test user account
   - Copy user ID and credentials

2. **Update `.env.test`**:

   ```env
   E2E_USERNAME_ID=<user_id_from_supabase>
   E2E_USERNAME=test@example.com
   E2E_PASSWORD=TestPassword123
   ```

3. **Run tests**:
   ```bash
   npm run test:e2e
   ```

---

## Switching Between Environments

### Development → Production Testing

**Warning**: Only do this temporarily for testing production API!

1. **Backup your local `.env`**:

   ```bash
   cp .env .env.backup
   ```

2. **Copy production values**:

   ```bash
   cp .env.production .env
   ```

3. **Update with real production secrets** (from password manager or Cloudflare dashboard)

4. **Test the feature**

5. **Restore local environment**:
   ```bash
   cp .env.backup .env
   ```

### Production → Local (Restore)

```bash
# Reset to local Supabase
sed -i 's|https://uiyurwyzsckkkoqthxmv.supabase.co|http://127.0.0.1:54321|g' .env
```

Or simply edit `.env` manually:

- Change `PUBLIC_SUPABASE_URL` to `http://127.0.0.1:54321`
- Change `SUPABASE_URL` to `http://127.0.0.1:54321`

---

## Production Backup

### Quick Backup

Run the automated backup script:

```bash
npm run backup:production
```

This will create:

- `backups/production_backup_TIMESTAMP.sql` - Full database dump
- `backups/production_data_backup_TIMESTAMP.json` - Data in JSON format
- `backups/backup_summary_TIMESTAMP.json` - Backup metadata

### Manual Backup

```bash
# Ensure SUPABASE_ACCESS_TOKEN is set
export SUPABASE_ACCESS_TOKEN=sbp_your_token_here

# Backup database schema and data
supabase db dump --project-ref uiyurwyzsckkkoqthxmv > backups/manual_backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Restore to local Supabase
supabase db reset
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres < backups/production_backup_20251115.sql
```

### Backup Best Practices

1. **Regular backups**: Run weekly or before major deployments
2. **Test restores**: Verify backups work by restoring to local Supabase
3. **Secure storage**: Keep backups in encrypted cloud storage (Google Drive, Dropbox, etc.)
4. **Retention policy**: Keep at least 3-5 recent backups (script auto-cleans old backups)
5. **Before production changes**: Always backup before running migrations or major updates

---

## Troubleshooting

### Problem: Client and Server Use Different Databases

**Symptoms**:

- Login works but user data doesn't load
- Features work in backend but fail in frontend
- CORS errors or authentication mismatches

**Solution**:
Check that both URLs match in `.env`:

```bash
grep SUPABASE_URL .env
# Should show:
# SUPABASE_URL=http://127.0.0.1:54321
# PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

### Problem: E2E Tests Fail with "User not found"

**Solution**:

1. Check that `.env.test` points to local Supabase (`http://127.0.0.1:54321`)
2. Verify test user exists in local database
3. Reset local database: `supabase db reset`

### Problem: "SUPABASE_ACCESS_TOKEN not set" Error

**Solution**:

```bash
# Get token from: https://app.supabase.com/account/tokens
export SUPABASE_ACCESS_TOKEN=sbp_your_token_here

# Or add to .env file
echo "SUPABASE_ACCESS_TOKEN=sbp_your_token_here" >> .env
```

### Problem: Cloudflare Runtime Variables Not Working

**Symptoms**: API endpoints can't access `OPENROUTER_API_KEY`

**Solution**:

1. Ensure `.dev.vars` file exists
2. Restart dev server: `npm run dev`
3. Check variable access in API:
   ```typescript
   const apiKey = locals.runtime?.env?.OPENROUTER_API_KEY;
   ```

---

## Environment Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Build Time (Astro/Vite)                                 │
│ - Reads: .env                                           │
│ - Accessible: import.meta.env.*                         │
│ - PUBLIC_* variables exposed to client                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Runtime (Cloudflare Workers)                            │
│ Local Dev: platformProxy reads .dev.vars                │
│ Production: Cloudflare Pages environment variables      │
│ Accessible: locals.runtime.env.*                        │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Task                 | Command                     | File Used                        |
| -------------------- | --------------------------- | -------------------------------- |
| Local development    | `npm run dev`               | `.env`, `.dev.vars`              |
| E2E tests            | `npm run test:e2e`          | `.env.test`                      |
| Production backup    | `npm run backup:production` | Requires `SUPABASE_ACCESS_TOKEN` |
| Start local Supabase | `supabase start`            | `supabase/config.toml`           |
| Reset local database | `supabase db reset`         | `supabase/migrations/*`          |

---

## Security Checklist

- [ ] `.env` has local Supabase URLs (not production)
- [ ] `.env.test` uses local Supabase (not production)
- [ ] `.gitignore` includes `.env`, `.dev.vars`, `.env.local`
- [ ] Production secrets are only in Cloudflare Pages dashboard
- [ ] `SUPABASE_ACCESS_TOKEN` is in password manager
- [ ] Recent backups exist in `backups/` directory
- [ ] Backup files are not committed to git (added to `.gitignore`)

---

## Further Reading

- [Astro Environment Variables](https://docs.astro.build/en/guides/environment-variables/)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/environment-variables/)
- [Supabase CLI Reference](https://supabase.com/docs/guides/cli)
- [Supabase Backup Guide](https://supabase.com/docs/guides/platform/backups)
