# WA Gate - Progress Tracker

## Status: Bot E2E Verified — Runtime Reconnected — Continuing Tunnel Permanence + Remaining Tasks

## Current (2026-05-23 ~16:00 WIB)

### Latest fixes this session
0. **Bot no-reply recovery + runtime hardening:**
   - Restarted Windows WA runtime, scanned QR, verified runtime `connected`.
   - Updated Cloudflare Worker runtime secrets for current runtime tunnel and API key.
   - Verified E2E bot flow: `POST /api/runtime/incoming` returned 200, inbound inserted, outbound bot greeting status `sent`.
   - Added `wa-runtime-startup.ps1` and Windows Startup shortcut to auto-start runtime + quick cloudflared tunnel on login; Task Scheduler registration was blocked by Windows access denied.
   - Patched login page hardcoded dark outer theme so light mode now actually changes background, hero text, badges, and login shell.
   - Lint/build passed and deployed latest Worker version `9d20c368-61c9-4867-9d7a-dc986b812799`.

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

### Latest autonomous continuation (2026-05-23 — runtime persistence/tooling hardening)
9. **Cloudflared binary made independent from 9router path:**
   - Downloaded official `cloudflared.exe` to `C:\\Users\\Admin\\AppData\\Local\\cloudflared\\cloudflared.exe` and verified version `2026.5.0`.
   - Patched `wa-runtime-startup.ps1` to use that stable local binary instead of the missing/implicit `9router` cloudflared path.
   - Removed stale runtime API key placeholder comment from startup script; key is now loaded only from Windows User env var `WA_RUNTIME_API_KEY`.
   - Named/permanent Cloudflare Tunnel setup checked but blocked because `cloudflared tunnel list/create` requires an origin cert from interactive `cloudflared login`; no `cert.pem` exists yet.
   - Production route SSR smoke passed for login/dashboard/WA/templates/chatbot/officers/content/blast/api-keys/users/settings/inbox-live.
   - Root `bun run lint` and `bun run build` passed; deployed Worker version `80461a30-a8e3-49b6-9712-e906677003f4`.

### Latest autonomous continuation (2026-05-23 — chatbot parity + inbox-live fix)
10. **Inbox Live skeleton fixed:**
   - Root cause: `loadContacts()` did not clear loading state when `/api/messages/contacts` failed/unauthorized.
   - Fix: `src/routes/inbox-live.tsx` now wraps contact loading in `try/catch/finally`, preserving old contacts and always setting `loadingContacts=false`.
   - Live browser QA: `/inbox-live` after 5s had `animate-pulse=0` and displayed empty/auth state instead of endless skeleton.
11. **Chatbot engine rewritten to mirror `bot-wa-pst/src/handlers/router.ts`:**
   - Root cause: previous production webhook used generic `chatbot_rules_wagate` lookup and missed bot-wa-pst behavior (`menu`, session level, WAITING-first sequences, admin mode, multi-message responses).
   - Fix: `src/api/routes/runtime-webhook.ts` now persists `menuActive`, `level`, `adminMode`, `lastWelcomeAt` in contact metadata and implements top-level options 1–8 plus submenus for Perpustakaan, Rekomendasi, Konsultasi, KCDA.
   - First-ever `menu` now skips welcome and opens the main menu directly.
   - Required templates all verified active in `wa_templates_wagate`; stale XSS QA template `<script>alert(1)</script>` was removed.
   - Production webhook QA: option `5` after `menu` created outbound sequence `WAITING` → `STATISTIK_UMUM` → `WEB_BUSEL` → `THANKS` → `MAIN_MENU_NEXT` in `messages_wagate`.
   - Note: test number `6289616370100` is also active Admin 1 in `officer_numbers_wagate`, so admin notification to that number is expected.
   - Build/lint passed; deployed versions `85571f79-7f50-43f6-8d1e-af6aedb54323` then `95e05b05-6360-4c55-9b68-34f369929e2b`.

### Latest autonomous continuation (2026-05-23 — async chatbot timeout + superadmin fallback)
11. **Runtime webhook timeout fixed:**
   - Background test `proc_2dfed0eaacf7` showed T2/T3 timed out because `handleBot()` waited for human-like typing/sending inside the Worker request, exceeding Cloudflare request timeout.
   - Fixed `/api/runtime/incoming` to insert inbound message, call `c.executionCtx.waitUntil(handleBot(...))`, and immediately return `{ ok: true, botQueued: true }`.
   - Production QA after deploy `a2ffac9a-fbc6-4287-a8f7-f87d951058e7`: T1/T2/T3 all returned HTTP 200 within 10 seconds, no timeout.
12. **Local superadmin fallback added without modifying DB induk:**
   - Created wagate-only table `local_admins_wagate` and RPC `verify_local_admin_password()` in wagate DB only.
   - Added `superadmin` local fallback account and linked it to existing `admin` role via `user_roles_wagate`.
   - Auth flow still tries DB induk RPC; if it fails, local admin fallback is used.
   - Browser QA: `superadmin` login succeeds, dashboard shows Super Admin, `/api/templates` returns HTTP 200 and 19 templates.

### Pending
- Google Drive upload: service-account health OK, but actual PDF upload needs target folder inside Google Shared Drive because normal My Drive folder returns `storageQuotaExceeded` for service accounts.
- Permanent named runtime tunnel: run interactive `cloudflared login` once on Windows Admin account, then create/route a named tunnel for `wa-runtime.buseldata.com -> http://127.0.0.1:8789`; current quick tunnel + startup auto-update remains functional.
- Scan QR on backup Koyeb only if backup failover needs to be fully active.
- 4-view visual QA: desktop dark/light passed; mobile dark passed; mobile light needs manual/clean-session recheck.
- QA WA Blast dispatcher with real 2–3 allowed-history recipients only when safe; current production has no active queued/running blast job.
