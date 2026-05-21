# Deployment Guide - WA Gate BPS Buton Selatan

## Target Platform
Cloudflare Workers

## Domain
https://wa-gate.buseldata.com

## Cloudflare Credentials
- Account ID: `99ce5fef22626a0cb6328c214b8bae3f`
- API Token: `[REDACTED — set via Cloudflare dashboard or wrangler secret]`

## Pre-deployment Checklist

### 1. Build Verification
```bash
cd /mnt/c/laragon/www/wa-gate-tans
bun run build
# Must output: ✓ Build successful
```

### 2. Lint Verification
```bash
bun run lint
# Must output: ✓ No linting errors
```

### 3. Environment Variables
All env vars must be set in Cloudflare Workers dashboard:
- DATABASE_INDUK_URL
- DATABASE_URL
- JWT_SECRET
- SUPABASE_INDUK_URL
- SUPABASE_INDUK_ANON_KEY
- SUPABASE_URL
- SUPABASE_ANON_KEY
- GOOGLE_DRIVE_FOLDER_ID
- GOOGLE_OAUTH_CLIENT_ID
- GOOGLE_OAUTH_CLIENT_SECRET
- GOOGLE_OAUTH_REFRESH_TOKEN
- WA_ADMIN_KEY

## Deployment Steps

### 1. Configure wrangler.toml
```toml
name = "wa-gate-buseldata"
main = ".output/server/index.mjs"
compatibility_date = "2024-01-01"

[site]
bucket = ".output/public"

[[routes]]
pattern = "wa-gate.buseldata.com/*"
zone_name = "buseldata.com"
```

### 2. Deploy
```bash
bun run deploy
```

### 3. Verify Deployment
```bash
curl https://wa-gate.buseldata.com/api/health
# Expected: {"status":"ok"}
```

## Post-deployment Verification

### API Endpoints
- [ ] GET /api/health
- [ ] POST /api/auth/login
- [ ] GET /api/wa/status
- [ ] GET /api/templates
- [ ] GET /api/messages

### UI Pages
- [ ] Login page loads
- [ ] Dashboard accessible after login
- [ ] WA Connection page functional
- [ ] Chat interface renders
- [ ] All DataTables working

### Functionality
- [ ] Login with DB induk credentials
- [ ] WA QR code generation
- [ ] Send message
- [ ] Create blast job
- [ ] Upload file to Google Drive

## Rollback Plan

If deployment fails:
```bash
wrangler rollback
```

## Monitoring

Check logs:
```bash
wrangler tail
```

## Domain Configuration

DNS records for buseldata.com:
- Type: CNAME
- Name: wa-gate
- Target: wa-gate-buseldata.workers.dev
- Proxy: Enabled (orange cloud)
