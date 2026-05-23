# WA Gate - Progress Tracker

## Status: WA Account Persistence Fixed + Verified

## Current Situation (2026-05-23 ~08:32 UTC+8)

### Critical Fix: `wa_accounts_wagate` stayed empty after WA linked

**Observed:**
- Primary Windows runtime already linked and authenticated.
- `/api/wa/status` returned account:
  - `wid`: `6285124422205`
  - `pushname`: `Badan Pusat Statistik Kabupaten Buton Selatan`
- But `/api/wa-accounts` returned `data: []`.

**Root causes found:**
1. Runtime webhook auth used `process.env.WA_RUNTIME_API_KEY` only.
   - On Cloudflare Workers secrets are on `c.env`, not `process.env`.
   - This caused runtime `/api/runtime/session` backup to be unauthorized.
2. Session backup can be unreliable on Windows tar/session path flow.
3. App did not persist account metadata when runtime status clearly already exposed account info.
4. First status-upsert patch included nonexistent DB column `runtime_source`; removed it.
5. First upsert used `void upsert...`; made it `await` so persistence completes before returning status.

**Fixes applied:**
- `runtime-webhook.ts`: `isAuthorized(header, env)` now uses `c.env.WA_RUNTIME_API_KEY`.
- `runtime-webhook.ts`: `/session`, `/incoming` auth pass `c.env`.
- `wa-runtime.ts`: `/api/wa/status` now persists connected/authenticated account to `wa_accounts_wagate` using runtime account info.
- `wa-runtime.ts`: removed invalid `runtime_source` payload.
- `wa-runtime.ts`: await the account upsert.

### Verified production result
After calling `/api/wa/status`, `/api/wa-accounts` now returns:
- `phone_number`: `6285124422205`
- `name`: `Badan Pusat Statistik Kabupaten Buton Selatan`
- `status`: `authenticated`
- `last_connected_at`: `2026-05-22T23:52:06.599+00:00`

### Latest deploys/commits
- `cb4a0ae fix: authorize runtime webhook using worker env`
- `528a74a fix: persist connected WA account from runtime status`
- `21d0c14 fix: remove nonexistent runtime_source column from upsert`
- `d97d42d fix: await WA account upsert from runtime status`
- Current Version ID: `6ea90277-2375-4483-b638-dd245d991916`

### Pending next checks
- User send WA message again and verify:
  - inbox list fills live,
  - inbound message appears,
  - bot outbound reply appears,
  - bot reply status is `sent` not `failed`.
- Improve runtime session backup reliability on Windows if still needed.
- 4-view visual QA.
- Google Drive OAuth remains blocked (`invalid_grant`).