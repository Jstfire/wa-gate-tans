# Deployment Notes

## Latest Deployment (2026-05-23)

### Current production
- App domain: `https://wa-gate.buseldata.com`
- Worker: `wa-gate-tans`
- Latest deployed version ID: `d3bf0328-faa1-4cc5-b9f0-320fcbc1071b`
- Previous checkmark/LID display fix deploy: `df09ca77-b05a-457b-995d-6440e26b47dc`
- Previous bubble tail CSS deploy: `1d1fccf8-f44f-43ea-8e06-7494dda1edbf`
- Previous WA Web bubble style overhaul deploy: `a8e8ed5a-fa26-4250-91ff-8ae14af06d96`
- Previous non-JSON runtime response handling deploy: `54ba06f8-81db-44fc-8afa-9795712a93a4`
- Previous session TTL 1-week deploy: `3c070230-f565-4c1e-bfb0-491f3f9888f1`
- Previous auth cache stale fix deploy: `5b34fc4e-1fee-45fe-ae4c-e7f4295a85e5`
- Previous session expiration redirect deploy: `e8d8b83b-a6c8-4f87-9fec-7cf6407bf599`
- Previous forced fixed full-screen inbox deploy: `be4b7d00-658a-40f1-beb9-cb17da03175e`
- Previous Inbox fullscreen restoration deploy: `623bacd9-1d15-423e-aa8d-58de1a494aa3`
- Previous Inbox pixel-feel refinement deploy: `4eca32bb-6913-4594-bbe5-33c30aaf65c1`
- Previous functional Inbox actions/no call-video deploy: `613f4de8-7204-429f-abbd-3174e8497b6a`
- Previous WhatsApp Web screenshot UI matching deploy: `f6b8a453-b2a7-4e2f-a534-2f1c6e4cc3a7`
- Previous unresolved sender/status broadcast skip deploy: `7c4bf764-543a-45ca-8a85-ca9a8f39f3fb`
- Previous Inbox Live WhatsApp formatting/actions deploy: `6bd93811-a537-4d44-9042-6e568e413277`
- Previous unsafe LID recent-recipient fallback removal deploy: `82550a93-385d-4de3-a696-9a7950296b70`
- Previous bot LID grouping fix deploy: `f3bfc03b-6510-4d95-a1d1-7f8f78a22fec`
- Previous inbox message_type insert fix deploy: `2b976e30-6e4b-4da2-b539-5355d64f3aef`
- Previous inbox send status constraint fix deploy: `222fba8e-bcdc-4104-b677-3bf59c0f4853`
- Previous inbound real-number notification deploy: `dcde8f1b-9289-4309-bd9e-5f4b706f694e`
- Previous inbox LID visibility deploy: `8807e66b-3ae5-4256-91ef-a916cdba546e`
- Previous inbox send persistence deploy: `88e1ae89-f78d-4ee8-9a2f-280bd8048dc9`
- Previous inbox new-chat format label deploy: `608d629f-4e7e-47f0-a776-bb245cd85f4c`
- Previous inbox realtime polling deploy: `745e2d3c-f0f4-4037-a37c-8040cb534bf8`
- Previous inbox new-chat deploy: `22898579-7042-42b7-89b5-f52d3898e26d`
- Previous inbox optimistic merge deploy: `ac760bf9-5761-4453-bc5d-a0f1c94ed5ed`
- Previous inbox LID/08 normalization deploy: `8b609be2-6131-494b-a0a7-c90478cc433c`
- Previous inbox/chatbot deploy: `0414504d-2234-481d-ad1c-acc866f40bb1`
- Previous datatable deploy: `b7cefa5f-0ced-4e7f-b6e2-5154c4730981`
- Previous datatable unwrap deploy: `a7e30c1c-7bb2-4fd6-b284-733b2f6e65da`
- Previous local admin fallback deploy: `1cd55974-2f7a-41d4-af89-d5560fbfa53c`
- Previous waitUntil chatbot timeout fix: `a2ffac9a-fbc6-4287-a8f7-f87d951058e7`
- Previous chatbot parity + inbox-live fix: `95e05b05-6360-4c55-9b68-34f369929e2b`
- Previous chatbot rewrite deploy: `85571f79-7f50-43f6-8d1e-af6aedb54323`
- Previous cloudflared/startup hardening deploy: `80461a30-a8e3-49b6-9712-e906677003f4`
- Previous runtime reconnect deploy: `fbd78a2a-1e6f-4393-a8b0-7da291229490`
- Previous login light-mode deploy: `9d20c368-61c9-4867-9d7a-dc986b812799`

### Latest code changes deployed
- `0c60299 docs: verify bot E2E working after runtime reconnect`
- `dd3e76f docs: record bot regression triage and runtime reconnect`
- `63235b5 fix: remove --single-process flag, ignore wwebjs auth dirs from eslint/git`
- `b9a7b7e fix: make settings page persistence truthful`
- `57eb98a fix: make datatable row selection visible`

### Build/deploy validation
- `bun run lint` passed.
- `bun run build` passed.
- Build warning about `src/routes/api/$.ts does not export a Route` was fixed by renaming the custom API catch-all route to `src/routes/api/-$.ts`, which TanStack route generation ignores via the configured `routeFileIgnorePrefix: "-"`.
- `bunx wrangler deploy` passed.

### QR refresh status
- QR refresh from WA Gate web is live-browser verified.
- Primary QR DOM hash changed after clicking `Refresh QR primary`:
  - before: `ed3198be`
  - after: `99f869ca`
- Backup QR remained unchanged, confirming targeted runtime refresh.

### Runtime URLs
- Public display/runtime URL: `https://wa-runtime.buseldata.com`
- Backup Koyeb runtime remains available as backup.
- Internal Worker fetch URL is stored only as Cloudflare secret (`WA_RUNTIME_INTERNAL_URL`) and must not be exposed in docs/UI.

### Deploy commands
Use only bun/bunx:
```bash
bun run lint
bun run build
bunx wrangler deploy
```

### Known deployment notes
- Cloudflare had a temporary `entitlements.not_available [code: 10007]` outage earlier; later deploys succeeded.
- Background retry process `proc_8880f83ef62e` printed `DEPLOY SUCCESS`, but it was from an older loop and later deployments superseded it.
- Background retry process `proc_53a129eee116` later completed with exit code `-15` because it was killed after successful manual deploys; it is obsolete and does not indicate current deployment failure.

### Permanent Google Drive API connection
- Production code now supports Service Account JWT for Google Drive uploads using native fetch.
- Preferred secret: `GOOGLE_SERVICE_ACCOUNT_JSON` containing the full service-account JSON key.
- Keep `GOOGLE_DRIVE_FOLDER_ID` set to target folder `1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D`.
- One-time Google setup: share the target folder with the service account `client_email` as Editor.
- Set Worker secret with: `bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON`.
- Verify with authenticated endpoint: `GET /api/content/drive/status`.
- Old OAuth envs remain fallback only; production should not depend on expired user refresh tokens once Service Account secret is set.

### Worker cron triggers
- `wrangler.jsonc` now includes cron trigger `* * * * *`.
- Custom Worker entry exports `scheduled(controller, env, ctx)` and calls `processBlastQueue(env)` for WA Blast dispatch.
- Deployment verification: `bunx wrangler deploy` showed `Deployed wa-gate-tans triggers` and `schedule: * * * * *`.
- Latest deploy for cron dispatcher: `fd4dae03-b882-4b81-a99c-8fd0df76520b`.

### Remaining deployment work
- Continue live QA mobile light/dark.
- Move Google Drive content folder into Shared Drive and update `GOOGLE_DRIVE_FOLDER_ID`; service-account auth itself is already OK.
- Scan backup Koyeb QR only if backup failover is required.

### Runtime LID Resolution Update (2026-06-01)
- Runtime updated with `getContactLidAndPhone()` for LID→phone resolution
- Origin URL hardcoded to `https://wa-gate.buseldata.com` (prevents stale tunnel URLs)
- Self-healing watchdog added (60s interval)
- Windows-compatible paths (`.wwebjs_auth`, `.wwebjs_cache`)
- wa-gate-runtime commit: `75dc2d5`
- wa-gate-tans commit: `6effcfa`

### Cloudflare Token Issue (2026-06-01)
- Old CLOUDFLARE_API_TOKEN expired/insufficient permissions (error 9106)
- Updated SUPABASE_INDUK_URL and SUPABASE_INDUK_SERVICE_ROLE_KEY secrets via wrangler
- Need new token with Workers deploy permission to redeploy
