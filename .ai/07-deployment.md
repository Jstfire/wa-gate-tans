# Deployment Notes

## Latest Deployment (2026-05-23)

### Current production
- App domain: `https://wa-gate.buseldata.com`
- Worker: `wa-gate-tans`
- Latest deployed version ID: `8807e66b-3ae5-4256-91ef-a916cdba546e`
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
