# WA Gate - Progress Tracker

## Status: Inbox Live Now Working — Bot Reply Pending Runtime Restart

## Current (2026-05-23 ~08:55 UTC+8)

### Latest fixes
1. **Messages API — inbox endpoints fixed:**
   - `/api/messages/contacts` now returns camelCase `Contact[]` directly (no `{data}` wrapper).
   - `/api/messages/conversation/:phone` endpoint added — returns mapped `JsMessage[]` with camelCase fields.
   - `/api/messages/send` casts `c.env as RuntimeEnv` for sendViaRuntime.
   - Messages mapped with `mapMessage()` from snake_case DB rows to camelCase UI types.

2. **Runtime `toChatId` LID fix:**
   - `wa-gate-runtime/src/index.ts`: `toChatId()` now preserves `@lid` suffix.
   - Pushed to `https://github.com/Jstfire/wa-gate-runtime` commit `da38117`.
   - **Windows runtime needs restart** to pick up this fix.

### Verified production
- Inbox live shows contacts + messages (4 contacts, messages with timestamps).
- `/api/wa-accounts` has account: `6285124422205 - Badan Pusat Statistik Kab. Buton Selatan`.
- `/api/chatbot` returns 23 rules.
- All SSR routes HTTP 200.
- Build lint deploy all pass.

### Pending
- **User must restart Windows runtime** to get LID chatId fix → bot will start replying.
- Deduplicate `@lid` vs normal phone contacts in contacts API.
- Filter own number from contacts list.
- 4-view visual QA.
- Google Drive OAuth blocked.

### Latest commits
- `c79d6a1 fix: add conversation endpoint and map messages for inbox UI`
- `2364988 docs: update progress with wa_accounts fix verification`
- Runtime: `da38117 fix: preserve LID chat IDs when sending replies`
- Deploy: `7478d999-ce23-4ccc-81f2-dd7357357acb`