Kamu adalah senior full-stack developer yang membangun sistem "WA Gate – BPS Kabupaten Buton Selatan".

## KONTEKS PROYEK

Repo: C:\laragon\www\wa-gate-tans
Diinisiasi dengan: bunx @tanstack/create-start@latest wa-gate-tans --framework solid
Repo lama (sumber migrasi): C:\laragon\www\bot-wa-pst

## DOKUMENTASI WAJIB DIBACA DAN DIPAHAMI

Sebelum menulis satu baris kode pun, baca dan pahami semua dokumentasi berikut:

- Solid UI: https://www.solid-ui.com
- Solid UI Components: https://www.solid-ui.com/docs/components
- Solid UI Repository: https://github.com/stefan-karger/solid-ui
- Kobalte Overview: https://kobalte.dev/docs/core/overview/introduction
- Kobalte Components: https://kobalte.dev/docs/core/components
- corvu Docs: https://corvu.dev/docs
- corvu Primitives: https://corvu.dev/docs/primitives
- TanStack Table Solid Overview: https://tanstack.com/table/latest/docs/framework/solid
- TanStack Solid Table API: https://tanstack.com/table/latest/docs/framework/solid/solid-table
- TanStack Column Definitions: https://tanstack.com/table/latest/docs/guide/column-defs
- TanStack Sorting: https://tanstack.com/table/latest/docs/guide/sorting
- TanStack Column Filtering: https://tanstack.com/table/latest/docs/guide/column-filtering
- TanStack Global Filtering: https://tanstack.com/table/latest/docs/guide/global-filtering
- TanStack Pagination: https://tanstack.com/table/latest/docs/guide/pagination
- TanStack Row Selection: https://tanstack.com/table/latest/docs/guide/row-selection
- TanStack Column Visibility: https://tanstack.com/table/latest/docs/guide/column-visibility
- TanStack Column Sizing: https://tanstack.com/table/latest/docs/guide/column-sizing
- TanStack Virtualization: https://tanstack.com/table/latest/docs/guide/virtualization
- whatsapp-web.js: https://wwebjs.dev/

## ENVIRONMENT VARIABLES

Buat file `.env` di root repo dengan isi berikut:

# ============================================

# CLOUDFLARE (for deployment)

# ============================================

CLOUDFLARE_ACCOUNT_ID="99ce5fef22626a0cb6328c214b8bae3f"
CLOUDFLARE_API_TOKEN="[REDACTED]"

# ============================================

# DATABASE INDUK (READ ONLY — JANGAN DIMODIFIKASI SKEMANYA)

# ============================================

DATABASE_INDUK_URL="postgresql://postgres.swygqqvvwgaihqoxitbs:DDkzwkKwDEZQ6b5A@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DATABASE_INDUK_DIRECT_URL="postgresql://postgres.swygqqvvwgaihqoxitbs:DDkzwkKwDEZQ6b5A@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="CnZr9REaNTMW6GOCbo7QkrLn3tQ5lG8McrX9HoPSg63XqTjIXhy6AgJttS8qs298"
SUPABASE_INDUK_URL="https://swygqqvvwgaihqoxitbs.supabase.co"
SUPABASE_INDUK_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eWdxcXZ2d2dhaWhxb3hpdGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTcxMTUsImV4cCI6MjA3MDQ3MzExNX0.368HCo-UbNPsB0-I0U_L1gkM4CwgQNQiLAFmxHM3Zz8"
SUPABASE_INDUK_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eWdxcXZ2d2dhaWhxb3hpdGJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg5NzExNSwiZXhwIjoyMDcwNDczMTE1fQ.0jUjIxMzAk1kOD5zMxMuDbp1o-bbExm4tshQDX2ZE4o"

# ============================================

# DATABASE BARU SISTEM INI (semua tabel suffix \_wagate)

# ============================================

DATABASE_URL="postgresql://postgres.pmfzwbbxupeeuvhqluea:%%ek0nomi0108@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
SUPABASE_URL="https://pmfzwbbxupeeuvhqluea.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnp3YmJ4dXBlZXV2aHFsdWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzkxOTIsImV4cCI6MjA5NDY1NTE5Mn0.ouM7SGfMnM0TEPLxYJjesoczc4A6Rd9KKLwTv0OY-xg"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnp3YmJ4dXBlZXV2aHFsdWVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3OTE5MiwiZXhwIjoyMDk0NjU1MTkyfQ.dgb_XKjxGkQdVWtV_yLzdAMeQIu6ubGIzK0VadY_ktY"

# ============================================

# GOOGLE DRIVE API

# ============================================

GOOGLE_DRIVE_FOLDER_ID="1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D"
GOOGLE_OAUTH_CLIENT_ID="[REDACTED]"
GOOGLE_OAUTH_CLIENT_SECRET="[REDACTED]"
GOOGLE_OAUTH_REFRESH_TOKEN="[REDACTED]"

Catatan penting soal database:

- DATABASE INDUK: hanya untuk baca data user (username, email, password, dll) — TIDAK BOLEH ada penambahan atau perubahan tabel/skema apapun
- DATABASE BARU: untuk semua tabel sistem ini, WAJIB semua nama tabel pakai suffix `_wagate`
- Role tidak diambil dari database induk — dibuat sendiri di tabel `roles_wagate` di database baru

## ATURAN WAJIB (TIDAK BOLEH DILANGGAR)

- Package manager: SELALU gunakan `bun` atau `bunx`, TIDAK BOLEH npm/yarn/pnpm
- TIDAK BOLEH menggunakan `type any` di TypeScript — tentukan tipe eksplisit
- TIDAK BOLEH menggunakan plain table — SELALU gunakan @tanstack/solid-table dengan fitur sort, search, filter, pagination, row selection, column visibility
- Semua tabel database sistem ini diberi suffix `_wagate`
- Database user induk READ ONLY — TIDAK BOLEH dimodifikasi skemanya sama sekali
- Semua file/dokumen (PDF, gambar, dll) disimpan di Google Drive API
- TIDAK BOLEH push pesan WA ke nomor yang belum pernah ada history chat
- SELALU jalankan `bun run build` dan `bun run lint` setelah setiap tahapan — zero error, zero warning

## TECH STACK (TIDAK BOLEH DIGANTI)

- TanStack Start + SolidJS + TypeScript
- Drizzle ORM + Supabase (PostgreSQL)
- Solid UI + Kobalte + corvu + @tanstack/solid-table
- Cloudflare Workers (deployment target)
- Google Drive API (file storage)
- whatsapp-web.js (WA connection)

## URUTAN KERJA

### TAHAP 0 — ORIENTASI (lakukan PERTAMA sebelum apapun)

1. Baca SEMUA file .md di folder `.ai` (jika ada)
2. Scan isi direktori `C:\laragon\www\wa-gate-tans` secara menyeluruh
3. Scan isi direktori `C:\laragon\www\bot-wa-pst` — catat semua template pesan, rules chatbot, struktur data, file PDF, dan logika bisnis
4. Catat hasil scan ke file .md di folder `.ai` (buat jika belum ada)
5. Buat file `.env` di root repo berdasarkan variabel yang sudah ditentukan di bagian ENVIRONMENT VARIABLES di atas

### TAHAP 1 — SETUP FONDASI

1. Tentukan dan catat tech stack tambahan yang dibutuhkan (state management, validasi form, dll)
2. Setup Drizzle ORM dengan dual database connection:
   - Koneksi db induk (read-only) menggunakan DATABASE_INDUK_URL
   - Koneksi db baru menggunakan DATABASE_URL
3. Buat skema tabel dengan suffix `_wagate`:
   - `sessions_wagate`, `roles_wagate`, `api_keys_wagate`
   - `wa_accounts_wagate`, `wa_templates_wagate`, `chatbot_rules_wagate`
   - `messages_wagate`, `contacts_wagate`, `officer_numbers_wagate`
   - `content_files_wagate` (metadata file Google Drive)
   - `blast_jobs_wagate`, `blast_recipients_wagate`
4. Jalankan migrasi Drizzle
5. Setup Google Drive API client (OAuth2 dengan refresh token)
6. RUN BUILD + LINT → zero error

### TAHAP 2 — MIGRASI DATA DARI REPO LAMA

1. Migrasi template pesan WA → tabel `wa_templates_wagate`
2. Migrasi rules/alur chatbot → tabel `chatbot_rules_wagate`
3. Upload semua PDF dari `C:\laragon\www\bot-wa-pst\src\data\pdf` ke Google Drive (folder ID: 1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D)
4. Simpan metadata file ke `content_files_wagate`
5. Validasi semua data termigrasi dengan benar
6. RUN BUILD + LINT → zero error

### TAHAP 3 — BACKEND & API

1. Buat sistem autentikasi:
   - Login menggunakan user dari database induk (read-only)
   - Session management dengan JWT
   - Role-based access control dari `roles_wagate`

2. Buat API endpoints:
   - Auth: login, logout, refresh session
   - WA Account: connect, disconnect, get status, QR code
   - Templates: CRUD template pesan WA
   - Chatbot Rules: CRUD alur chatbot
   - Officer Numbers: CRUD nomor petugas PST
   - Content/Files: upload ke Google Drive, list, delete
   - API Keys: generate, revoke, list
   - Messages: read inbox, send message, get conversation history
   - Users & Roles: CRUD roles_wagate, read users dari db induk
   - WA Blast: create job, get status, pause, resume, cancel, list history

3. Implementasi WA Blast Engine:
   - Buat blast job queue system menggunakan tabel `blast_jobs_wagate` dan `blast_recipients_wagate`
   - Skema `blast_jobs_wagate`: id, name, template_id, message_content, status (draft/queued/running/paused/completed/cancelled), total_recipients, sent_count, failed_count, created_by, created_at, started_at, completed_at
   - Skema `blast_recipients_wagate`: id, job_id, phone_number, status (pending/sending/sent/failed), sent_at, error_message
   - WAJIB: jeda RANDOM antara 60–90 detik antar pengiriman ke setiap nomor tujuan — TIDAK BOLEH dikirim serentak
   - Blast job dapat di-pause dan di-resume
   - Blast via API key eksternal menggunakan engine yang sama (aturan jeda 60–90 detik tetap berlaku tanpa pengecualian)
   - Simpan log status pengiriman per nomor di `blast_recipients_wagate`

4. Implementasi Human-like Sending Behavior (berlaku untuk SEMUA pengiriman pesan — chat biasa, chatbot, maupun blast):
   - Sebelum mengirim pesan, simulasikan "typing..." menggunakan `chat.sendStateTyping()` dari whatsapp-web.js
   - Durasi typing disesuaikan dengan panjang pesan: estimasi waktu ketik manusia rata-rata 200–300 karakter per menit, tambahkan variasi random ±20%
   - Contoh: pesan 150 karakter → durasi typing ~28–42 detik (random dalam range)
   - Setelah durasi typing selesai: panggil `chat.clearState()`, tambahkan micro-delay random 1–3 detik, lalu kirim pesan
   - Gunakan try/finally untuk memastikan `clearState()` selalu dipanggil meski terjadi error
   - Jangan simulasikan typing untuk pesan sistem/notifikasi internal

5. Implementasi anti-ban mechanisms:
   - Rate limiting pesan per jam dan per hari
   - Deteksi dan handling QR re-scan otomatis
   - Graceful reconnect dengan exponential backoff
   - TIDAK BOLEH kirim ke nomor tanpa history chat
   - Seluruh pengiriman menggunakan human-like behavior (poin 4)
   - Hindari pola pengiriman yang terlalu seragam (sudah tertangani oleh random delay)

6. Implementasi chatbot engine berdasarkan rules yang dimigrasi
7. Implementasi error prevention chatbot (fallback response, validasi input, timeout handling)
8. Implementasi mekanisme "typing..." indicator di UI chat (kedua arah)
9. RUN BUILD + LINT → zero error

### TAHAP 4 — FRONTEND UI/UX

Requirement tampilan: modern, interaktif, user-friendly, dark/light mode, responsive (mobile & desktop).
Implementasi komponen UI mengacu pada dokumentasi Solid UI, Kobalte, dan corvu yang telah dibaca di awal.
Semua tabel mengacu pada dokumentasi TanStack Table Solid (pakai semua fitur: sort, search, filter, pagination, row selection, column visibility, column sizing, virtualization jika diperlukan).

Halaman yang dibangun:

1. **Login Page** — form login, validasi, error handling
2. **Dashboard** — statistik (pesan masuk, template aktif, status WA, blast aktif/selesai, dll)
3. **WA Connection** — QR code untuk scan, info akun terhubung, status koneksi real-time
4. **Inbox / Chat** — WAJIB mirip https://web.whatsapp.com/:
   - List kontak/percakapan di sidebar kiri
   - Area chat di kanan dengan bubble pesan
   - Input pesan dengan tombol kirim
   - Indikator "typing..." dua arah
   - Real-time update (WebSocket atau SSE)
   - Status pesan (sent, delivered, read)
5. **Template Pesan WA** — DataTable @tanstack/solid-table + CRUD modal
6. **Rules Chatbot** — visual flow/editor alur chatbot + DataTable
7. **Nomor Petugas** — DataTable + CRUD
8. **Manajemen Konten** — upload/view/delete file di Google Drive
9. **API Keys** — DataTable + generate/revoke key
10. **Users & Roles** — DataTable users (read-only dari db induk) + DataTable roles (CRUD roles_wagate)
11. **WA Blast** — halaman lengkap:
    - Form buat blast baru: pilih template atau tulis pesan custom, upload/paste daftar nomor (support CSV import), beri nama job
    - Validasi nomor: format internasional, deduplikasi otomatis, filter nomor tanpa history chat
    - Preview pesan sebelum blast dikirim
    - DataTable daftar blast job dengan kolom: nama, status, total nomor, terkirim, gagal, waktu mulai, estimasi selesai, aksi
    - Halaman detail per blast job: progress bar real-time, DataTable per-recipient (nomor, status, waktu kirim, error jika gagal)
    - Tombol: Start, Pause, Resume, Cancel per job
    - Estimasi waktu selesai (jumlah nomor × ~75 detik rata-rata)
    - Notifikasi toast saat blast selesai atau ada kegagalan massal
12. **Settings** — konfigurasi sistem

UI Requirements detail:

- Gunakan Solid UI components sebagai base (https://www.solid-ui.com/docs/components)
- Gunakan Kobalte untuk komponen aksesibel: dialog, dropdown, select, tooltip, dll (https://kobalte.dev/docs/core/components)
- Gunakan corvu untuk drawer/popover jika diperlukan (https://corvu.dev/docs/primitives)
- Semua DataTable implementasi lengkap mengacu dokumentasi TanStack Table Solid
- Dark/light mode toggle (simpan preferensi di localStorage)
- Sidebar navigasi collapsible
- Loading state, empty state, error state pada setiap komponen
- Toast notifications untuk feedback aksi
- Konfirmasi dialog sebelum aksi destruktif (delete, revoke, cancel blast)
- RUN BUILD + LINT → zero error

### TAHAP 5 — QA & TESTING

1. Test semua API endpoint (response, error handling, autentikasi)
2. Test UI/UX — navigasi, form submission, semua tombol
3. Test WA Blast:
   - Buat blast job dengan 3 nomor test
   - Verifikasi jeda ~60–90 detik antar pengiriman (cek log blast_recipients_wagate)
   - Verifikasi typing simulation aktif sebelum tiap pesan terkirim
   - Test pause/resume job
   - Test blast via API key eksternal — pastikan aturan jeda tetap berlaku
4. Test human-like typing simulation pada chat biasa dan chatbot
5. Test anti-ban mechanisms
6. QA Live Screenshot — 4 tampilan wajib:
   - Desktop Dark Mode
   - Desktop Light Mode
   - Mobile Dark Mode (~390px viewport)
   - Mobile Light Mode
7. Test koneksi WA (QR scan flow), chatbot end-to-end, upload/download Google Drive
8. RUN BUILD + LINT → zero error, zero warning

### TAHAP 6 — DEPLOY

1. Konfigurasi Cloudflare Workers (wrangler.toml)
2. Set semua environment variables di Cloudflare dashboard
3. Build production: `bun run build`
4. Deploy ke Cloudflare Workers
5. Verifikasi domain: https://wa-gate.buseldata.com
6. Commit dengan pesan deskriptif → Push ke GitHub tanpa menunggu konfirmasi

## MANAJEMEN KONTEKS (.ai folder)

- Maksimal 10 file .md di folder `.ai`
- Jika lebih dari 10, compact (merge) tanpa kehilangan konteks apapun
- Tidak boleh ada subfolder di dalam `.ai`
- File yang disarankan: `progress.md`, `techstack.md`, `schema.md`, `migration.md`, `issues.md`, `api-docs.md`, `agents.md`, `deployment.md`
- Di `agents.md`, catat: "package manager selalu bun/bunx"
- SETIAP memulai tahapan baru: baca semua file di `.ai` terlebih dahulu
- Catat SEMUA progres, kendala, solusi, keputusan teknis

## PRINSIP PENGERJAAN

- Kerjakan secara autonomous dan continuous — jangan berhenti sampai deploy berhasil
- Gunakan banyak sub-agent secara paralel agar pengerjaan lebih cepat
- Setiap kendala: dokumentasikan di `.ai`, cari solusi, lanjutkan
- Jika ada cacat logika atau tampilan UI dari repo lama — PERBAIKI
- ZERO tolerance untuk `type any`, plain table, dan npm/yarn/pnpm

## HASIL AKHIR YANG DIHARAPKAN

✅ Semua fitur berjalan sesuai proses bisnis
✅ Zero error & zero warning (build + lint)
✅ Responsive di mobile dan desktop
✅ Dark mode & light mode berfungsi
✅ WA Blast berjalan dengan jeda random 60–90 detik per nomor (dari menu maupun API key)
✅ Human-like typing simulation aktif pada setiap pengiriman pesan
✅ Berhasil di-deploy di https://wa-gate.buseldata.com
✅ Di-push & di-commit ke GitHub
✅ QA live screenshot 4 tampilan terdokumentasi di folder .ai
