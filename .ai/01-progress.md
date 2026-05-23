# WA Gate - Progress Tracker

## Status: Dashboard Resilient — Runtime Tunnel Down — Continuing QA

## Current (2026-05-23 ~09:25 UTC+8)

### Latest fixes this session
1. **Permanent Google Drive connection:**
   - Replaced `googleapis` OAuth-only Drive client with native fetch Drive client.
   - Added preferred Service Account JWT auth (`GOOGLE_SERVICE_ACCOUNT_JSON`) so Drive access can be permanent and not depend on expiring OAuth refresh tokens.
   - OAuth refresh-token auth remains fallback.
   - Added authenticated health endpoint `GET /api/content/drive/status`.
   - Still requires one-time secret setup and sharing folder `1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D` with service account email as Editor.

0. **WA Blast recipient safety:**
   - API now rejects/removes recipients that do not exist in `contacts_wagate` with `has_chat_history = true`.
   - Invalid/no-history blast creation tested in production and returns `No recipients have prior chat history`.
   - Accidental QA draft job was deleted from DB after verification.

1. **Messages API — inbox endpoints:**
   - `/api/messages/contacts` returns camelCase array, filters own number from `wa_accounts_wagate`.
   - `/api/messages/conversation/:phone` endpoint added with mapped messages.
   - `@lid` dedup by stripping suffix.
   - Timestamps normalized to colon format.

2. **Dashboard stats resilient:**
   - `Promise.all` → `Promise.allSettled` so individual API failures don't break entire dashboard.
   - WA status shows `disconnected` instead of `unknown` when runtime unreachable.

3. **Runtime `@lid` send fix pushed:**
   - `wa-gate-runtime` commit `da38117`: `toChatId` preserves `@lid`.
   - Windows runtime needs restart + Cloudflare Tunnel restart.

### Runtime status
- **Primary (Windows PC):** DOWN — Cloudflare Tunnel returns 502.
  - `WA_RUNTIME_INTERNAL_URL` secret points to stale quick tunnel URL.
  - User must restart Windows runtime + Cloudflare Tunnel service.
- **Backup (Koyeb):** UP — reachable, status `qr_pending` (needs scan).
  - Koyeb URL: `https://precise-melessa-ipds7415-39519134.koyeb.app`

### Latest commits
- `07122e5 fix: make dashboard stats resilient to individual API failures`
- `f903bea fix: normalize inbox timestamps to colon format, update QA docs`
- `489e3fd fix: derive own WA number from account table for inbox contacts`
- `2298391 fix: deduplicate contacts and filter own number from inbox`
- `c79d6a1 fix: add conversation endpoint and map messages for inbox UI`
- Deploy: `0a4d8cd8-2412-47ea-90f7-adebac062d41`

### Verified production
- wa_accounts_wagate: ✅ has row (6285124422205)
- Inbox contacts API: ✅ 2 external contacts (own filtered)
- Inbox conversation API: ✅ returns mapped messages
- Dashboard: ✅ resilient to runtime down
- Chatbot rules: ✅ 23 rules loaded
- All SSR routes: ✅ HTTP 200

### Pending
- Restart Windows runtime + Cloudflare Tunnel
- Scan QR on backup Koyeb if needed
- 4-view visual QA (desktop dark ✅, desktop light ✅, mobile pending)
- Google Drive OAuth blocked
