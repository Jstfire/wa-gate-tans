# WA Gate - Progress Tracker

## Status: QR Refresh + WCAG + Sidebar Flush — Deploy Blocked by CF Outage

## Current Situation (2026-05-22 ~16:00 UTC+8)

### What's Done (code + committed + pushed)
- `/api/wa/qr/by/:kind` GET now calls `fetchFreshQr()` — disconnects runtime, reconnects, polls new QR
- `/api/wa/qr/refresh/:kind` POST — same logic, explicit refresh endpoint
- UI wa-connection.tsx: per-card refresh button calls refresh endpoint, "Refresh 2 QR" calls both in parallel
- Sidebar flush to viewport edges (no gap top/bottom/left)
- WCAG: skip link, main landmark, aria-labels, aria-hidden decorative SVGs, aria-current on active nav
- inbox-live: text-[11px] → text-xs, send button type+aria-label

### What's Blocked
- Cloudflare API `entitlements.not_available [code: 10007]` on `assets-upload-session`
- CF Status page shows "Minor Service Outage"
- Affects ALL wrangler deploy attempts since ~15:25 UTC+8
- Background retry loop runs every 60s

### Latest Commits
- `982174a` fix: make sidebar flush with viewport edges
- `dd0b2c9` fix: use fetchFreshQr in qr/by endpoint for live refresh
- `5c0d812` feat: add QR refresh with disconnect/connect cycle

### Latest Successful Deploy
- Version: `3a009975-d629-4f97-b030-904786589bbc`
- Content: login simplification, sidebar/UI polish

### Pending After Deploy
1. Browser QA: click Refresh QR primary → verify QR image changes
2. Browser QA: click Refresh QR backup → verify QR image changes
3. Sidebar flush visual QA (desktop + mobile)
4. Commit deploy evidence screenshots to .ai/08-qa.md

## Runtime Architecture
- Primary: Windows PC via `https://wa-runtime.buseldata.com`
  - Internal fetch via quick tunnel `https://charms-treasures-modes-issued.trycloudflare.com`
  - Worker proxy bypasses CF redirect rule
  - Quick tunnel URL stored as CF secret `WA_RUNTIME_INTERNAL_URL`
- Backup: Koyeb via `https://precise-melessa-ipds7415-39519134.koyeb.app`
- Cloudflare Worker name: `wa-gate-tans`
- Domain: `https://wa-gate.buseldata.com`

## Completed Phases

### TAHAP 0-6 ✅ (see older logs below)
- Orientasi, Setup Fondasi, Migrasi Data, Backend & API, Frontend, QA, Deploy all completed
- 13 tables _wagate created, 19 templates + 23 chatbot rules migrated
- JWT auth, RBAC, all API routes, blast engine, chatbot engine implemented
- All pages built with Solid UI + Kobalte + TanStack Table
- 4-view QA screenshots captured
- Production deployed to https://wa-gate.buseldata.com

## Post-Launch Improvements (2026-05-22)
1. Dual WA runtime cards (Primary Windows + Backup Koyeb)
2. Per-runtime QR refresh (separate endpoint `/qr/by/:kind`)
3. WhatsApp-style standalone inbox (`/inbox-live`) opens in new tab
4. Glassmorphic command-center dashboard redesign
5. Sidebar + WCAG accessibility overhaul
6. QR refresh with disconnect/connect cycle for fresh QR generation
7. Sidebar flush to viewport edges

## Blockers
- ⚠️ CF deploy outage (entitlements.not_available 10007) — retrying
- ⚠️ Google Drive OAuth invalid_grant (needs new refresh token)
- ⚠️ Some SSR routes still crash 1101 (chatbot, officers, content, blast, api-keys, users)

## Files Structure
```
src/
├── api/
│   ├── index.ts
│   ├── middleware/ (auth, permission)
│   └── routes/ (auth, templates, chatbot, officers, messages, blast, content, api-keys, wa-accounts, wa-runtime, users)
├── components/
│   ├── data-table/
│   ├── layout/ (sidebar, header, app-layout)
│   └── ui/ (button, input, badge, card, dialog, toast)
├── contexts/ (auth, theme)
├── db/ (index, schema/, migrate, seed)
├── lib/ (jwt, password, rbac, phone, google-drive, cn)
├── routes/
│   ├── __root.tsx
│   ├── index.tsx (redirect to /login)
│   ├── login.tsx
│   ├── api/$.ts (Hono catch-all)
│   ├── inbox-live.tsx (standalone WhatsApp-style inbox)
│   └── _app/ (dashboard, wa-connection, inbox, templates, chatbot, officers, content, api-keys, blast, users, settings)
└── services/ (wa-client, chatbot-engine, blast-engine, index)
```

## GitHub
- Repo: `https://github.com/Jstfire/wa-gate-tans`
- Branch: `main`
- Remote URL: `https://github.com/Jstfire/wa-gate-tans.git`
