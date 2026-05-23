# WA Gate - Progress Tracker

## Status: Bot Reply Fix Deployed — Pending User Test

## Current Situation (2026-05-23 ~08:00 UTC+8)

### Critical Fix: Bot Not Replying (2 root causes found + fixed)

**Root Cause 1 — `env` not passed to runtime send:**
- `sendAndLog` called `sendViaRuntime(to, text)` without passing CF Workers `env`.
- On CF Workers, runtime URL/API key live on `c.env`, not `process.env`.
- Result: `runtimeFetch` got empty strings for URL/key → silent failure.

**Root Cause 2 — LID chatId mangled:**
- New WA contacts use `@lid` suffix (e.g. `246715890294786@lid`).
- `inboundPhone()` stripped `@lid` → stored plain number.
- Bot replied to plain number → `toChatId()` appended `@c.us` → wrong chatId.
- Fix: preserve original `body.from` (with `@lid`) as `replyTarget` for send.

**Fixes applied:**
- `runtime-webhook.ts`: pass `c.env as RuntimeEnv` to `handleBot`
- `runtime-webhook.ts`: preserve `@lid` suffix in `replyTarget`
- `runtime-webhook.ts`: all `sendAndLog` calls pass `env` parameter
- `wa-runtime.ts`: export `RuntimeEnv` type
- `runtime-webhook.ts`: `sendAndLog` catches send errors and always logs (success/fail)

### Previous cycle completed
- QR refresh live browser verified ✅
- SSR routes all HTTP 200 ✅  
- Templates/Content date fix ✅
- Build warning fix (api/$.ts) ✅
- Sidebar flush patch ✅

### Commits
- `6cca72d fix: pass worker env to bot runtime sends`
- `27b92fb fix: preserve chatId suffix for bot reply target`

### Deploy
- Version: `4b982fb8-26de-4dbe-8c56-6180889c8651`
- Domain: https://wa-gate.buseldata.com

### Pending
- User test: send "menu" ke nomor WA yang tertaut, cek apakah bot membalas
- Cek inbox UI menampilkan pesan masuk + balasan
- 4-view visual QA
- Google Drive OAuth expired