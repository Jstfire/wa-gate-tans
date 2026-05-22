# WA Gate Runtime for Northflank

Service ini menjalankan `whatsapp-web.js` di container Node/Bun terpisah dari Cloudflare Workers. Cloudflare Workers tetap menjadi web app/API utama, sedangkan runtime ini menangani Chromium, QR scan, session WhatsApp, dan pengiriman pesan.

## Kenapa dipisah

Cloudflare Workers tidak cocok untuk `whatsapp-web.js` karena membutuhkan Chromium/headless browser, filesystem session, dan proses long-lived. Northflank cocok karena menyediakan container Linux dan persistent volume.

## Endpoint

Public health tanpa auth:

```http
GET /health
```

Endpoint internal wajib bearer token:

```http
Authorization: Bearer <WA_RUNTIME_API_KEY>
```

- `GET /api/status` — status koneksi dan info akun.
- `GET /api/qr` — QR dalam `data:image/png;base64,...` untuk ditampilkan di UI.
- `POST /api/connect` — start/ensure client.
- `POST /api/disconnect` — destroy client.
- `POST /api/send` — kirim pesan dengan human-like typing.

Payload send:

```json
{
  "to": "6281234567890",
  "message": "Halo dari WA Gate",
  "simulateTyping": true
}
```

## Env Northflank

Set variable berikut di Northflank:

```bash
PORT=8787
WA_RUNTIME_API_KEY=<random-long-secret-sama-dengan-CF-worker>
WA_GATE_ORIGIN=https://wa-gate.buseldata.com
WA_RUNTIME_AUTO_START=true
WWEBJS_AUTH_PATH=/data/wwebjs_auth
WWEBJS_CACHE_PATH=/data/wwebjs_cache
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## Persistent volume

Mount volume Northflank ke:

```text
/data
```

Wajib persistent agar session WhatsApp tidak hilang setelah redeploy/restart.

## Northflank setup ringkas

1. Buat service baru dari GitHub repo `Jstfire/wa-gate-tans`.
2. Set build context/subdirectory ke `wa-runtime`.
3. Gunakan Dockerfile di `wa-runtime/Dockerfile`.
4. Expose port `8787`.
5. Tambahkan persistent volume mount `/data`.
6. Tambahkan env sesuai daftar di atas.
7. Deploy.
8. Cek health:

```bash
curl https://<northflank-domain>/health
```

9. Ambil QR:

```bash
curl https://<northflank-domain>/api/qr \
  -H "Authorization: Bearer <WA_RUNTIME_API_KEY>"
```

## Anti-ban behavior

`POST /api/send` selalu melakukan human-like typing saat `simulateTyping=true`:

- `chat.sendStateTyping()`
- durasi berdasarkan panjang pesan, 200-300 karakter/menit + random ±20%
- `chat.clearState()` selalu di `finally`
- micro-delay 1-3 detik sebelum send

WA Blast delay 60-90 detik tetap harus dijalankan oleh engine antrean utama sebelum memanggil endpoint send untuk tiap recipient.

## Integrasi Cloudflare Workers

Tambahkan env di WA Gate utama:

```bash
WA_RUNTIME_URL=https://<northflank-domain>
WA_RUNTIME_API_KEY=<same-secret>
```

Lalu endpoint WA Connection di Cloudflare bisa proxy ke:

- `${WA_RUNTIME_URL}/api/status`
- `${WA_RUNTIME_URL}/api/qr`
- `${WA_RUNTIME_URL}/api/connect`
- `${WA_RUNTIME_URL}/api/disconnect`
- `${WA_RUNTIME_URL}/api/send`

