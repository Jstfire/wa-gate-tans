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

## Northflank WA Runtime

- Decision: `whatsapp-web.js` runs as a separate long-lived container service on Northflank, not inside Cloudflare Workers.
- Reason: WA runtime needs Chromium/Puppeteer, persistent filesystem session (`.wwebjs_auth`), and long-lived process; Cloudflare Workers is stateless and unsuitable for this part.
- Added service folder: `wa-runtime/`
  - `Dockerfile`: Bun slim + Debian Chromium + required browser libraries.
  - `src/index.ts`: Hono HTTP runtime with `whatsapp-web.js`, LocalAuth, QR generation, connect/disconnect/status/send endpoints.
  - `README.md`: Northflank setup, env, volume mount, endpoint docs.
  - `.env.example`: required runtime env.
- Required Northflank volume mount: `/data` for `/data/wwebjs_auth` and `/data/wwebjs_cache`.
- Required env: `PORT=8787`, `WA_RUNTIME_API_KEY`, `WA_GATE_ORIGIN`, `WA_RUNTIME_AUTO_START=true`, `WWEBJS_AUTH_PATH=/data/wwebjs_auth`, `WWEBJS_CACHE_PATH=/data/wwebjs_cache`, `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
- Runtime endpoint auth: `Authorization: Bearer <WA_RU...EY>` for `/api/*`; `/health` is public.
- Active runtime URL: `https://p01--wa-gate-run--gp5472lgpk5w.code.run`.
- Cloudflare Worker secrets uploaded with Wrangler: `WA_RUNTIME_URL`, `WA_RUNTIME_API_KEY`.
- WA Gate API proxy routes: `/api/wa/status`, `/api/wa/qr`, `/api/wa/connect`, `/api/wa/disconnect`; `/api/messages/send` sends through the Northflank runtime.
- Anti-ban: `/api/send` implements human-like typing (`sendStateTyping`, duration based on message length, `clearState` in `finally`, micro-delay 1-3s). Blast queue still must enforce 60-90s delay between recipients before calling runtime send.
- Validation: `cd wa-runtime && bun install && bun run typecheck` passes; production `/api/wa/status` and `/api/wa/qr` return `qr_pending` with QR present via Cloudflare proxy.

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
