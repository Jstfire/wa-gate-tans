# Deployment Notes

## Latest Deployment (2026-05-23)

### Current production
- App domain: `https://wa-gate.buseldata.com`
- Worker: `wa-gate-tans`
- Latest deployed version ID: `946ea2ad-5f88-4335-ae3a-2050ec6b10f7`
- Previous verified QR refresh deploy: `6f691e5d-4c7b-46dc-af22-60b7ab4036ae`

### Latest code changes deployed
- `f4e4597 fix: make QR reactive by passing qrFor accessor into RuntimeCard`
- `21788e6 docs: update progress and QA with QR refresh verification`
- `4979fee chore: ignore custom API catch-all from route tree`

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

### Remaining deployment work
- Continue live QA mobile light/dark.
- Verify actual WhatsApp scan/connect after user scans fresh QR.
- Google Drive OAuth token remains blocked by `invalid_grant` until a new valid refresh token is supplied.
