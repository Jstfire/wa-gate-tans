# WA Gate - Progress Tracker

## Status: Primary Runtime Healthy — Bot Reply @lid Verified — Continuing GDrive/QA

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

3. **Runtime `@lid` send fix verified E2E:**
   - `wa-gate-runtime` commit `da38117`: `toChatId` preserves `@lid`.
   - Windows runtime restarted on port `8789`; Cloudflare Tunnel route `wa-runtime.buseldata.com -> http://127.0.0.1:8789` is healthy.
   - App `/api/wa/status/all` sees primary reachable/authenticated; `/api/wa/status` reports `runtimeSource=windows-primary`.
   - Inbound `halo` from `246715******786` stored as received; bot reply sent to `246715******786@lid` with status `sent`.

### Runtime status
- **Primary (Windows PC):** UP — Cloudflare Tunnel healthy, app sees runtime authenticated.
  - Local runtime command: `PORT=8789 bun run start`.
  - Public route: `https://wa-runtime.buseldata.com/api/status` returns connected/authenticated.
  - WA account: `6285124422205` / `Badan Pusat Statistik Kabupaten Buton Selatan`.
- **Backup (Koyeb):** non-critical; latest QA saw timeout/unreachable after earlier `qr_pending`. Needs scan/redeploy only if backup failover is required.
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

### Latest autonomous continuation (2026-05-23)
4. **WA Blast cron dispatcher deployed:**
   - Added Cloudflare Worker scheduled handler for cron `* * * * *`.
   - Added `processBlastQueue(env)` in `src/api/routes/blast.ts`.
   - Dispatcher picks one `queued/running` blast job per tick, sends at most one pending recipient, and enforces random 60–90s guard from the previous sent recipient.
   - Pause/resume/cancel respected because only `queued/running` jobs are processed.
   - Recipient state transitions: `pending -> sending -> sent/failed`; job counts/status refresh after each attempt.
   - Uses existing `sendViaRuntime(..., simulateTyping=true)` so runtime human-like typing remains active.
   - Build/lint passed; deployed version `fd4dae03-b882-4b81-a99c-8fd0df76520b`; trigger deployed as `schedule: * * * * *`.

### Latest autonomous continuation (2026-05-23 — runtime artifact sync)
5. **Runtime `@lid` preservation synced into repo artifact:**
   - Audit found production Windows runtime had already been patched/verified for `@lid`, but the in-repo `wa-runtime/src/index.ts` still only preserved `@c.us` and `@g.us`.
   - Risk: future Docker/Koyeb/Windows redeploy from this repo could regress bot replies by converting `@lid` chat IDs to `@c.us`.
   - Fixed `toChatId(input)` to preserve `@lid` as an already-qualified WhatsApp chat ID.
   - Verification: `cd wa-runtime && bun run lint`, then root `bun run lint` and `bun run build` all passed.

### Latest autonomous continuation (2026-05-23 — content upload hardening)
6. **Manajemen Konten backend hardened before Shared Drive final test:**
   - `POST /api/content/upload` now honors optional UI `name` field instead of ignoring it.
   - Added backend file validation: non-empty, max 25 MiB, allowed MIME families PDF/image/Word/Office documents.
   - Added category/name trimming and 255-char cap.
   - `DELETE /api/content/:id` now validates UUID before constructing REST filter.
   - Verification: root `bun run lint` and `bun run build` passed.

### Latest autonomous continuation (2026-05-23 — DataTable row selection UX)
7. **Generic TanStack DataTable row selection made visible/actionable:**
   - Added first-column checkboxes for row selection and page-level select-all.
   - Added selected-row counter and optional bulk-delete action surface.
   - Added stable `getRowId` prop so future table pages can identify selected rows by UUID instead of row index.
   - Fixed loading/empty `colSpan` to include the selection column.
   - Verification: `bun run lint` and `bun run build` passed.

### Latest autonomous continuation (2026-05-23 — Settings page truthful persistence/status)
8. **Settings page no longer performs pseudo-save:**
   - Replaced fake async save delay with real browser-local persistence under `wa-gate-settings`.
   - Added validation: hourly/day rate limits must be positive and day >= hour; blast delay minimum must be >=60s, max >= min, max <=300s.
   - Clarified that operator settings are local UI preferences until a server-side settings endpoint/table is introduced; blast engine remains hardcoded/safe at 60–90s.
   - Google Drive card now queries authenticated `/api/content/drive/status` live and shows mode/folder/status plus refresh button instead of stale “Perlu refresh token”.
   - Verification: `bun run lint` and `bun run build` passed.

### Pending
- Google Drive upload: service-account health OK, but actual PDF upload needs target folder inside Google Shared Drive because normal My Drive folder returns `storageQuotaExceeded` for service accounts.
- Scan QR on backup Koyeb only if backup failover needs to be fully active.
- 4-view visual QA: desktop dark/light passed; mobile dark passed; mobile light needs manual/clean-session recheck.
- QA WA Blast dispatcher with real 2–3 allowed-history recipients only when safe; current production has no active queued/running blast job.
