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

# ============================================

# DATABASE INDUK (READ ONLY — JANGAN DIMODIFIKASI SKEMANYA)

# ============================================

SUPABASE_INDUK_URL="https://swygqqvvwgaihqoxitbs.supabase.co"

# ============================================

# DATABASE BARU SISTEM INI (semua tabel suffix \_wagate)

# ============================================

SUPABASE_URL="https://pmfzwbbxupeeuvhqluea.supabase.co"

# ============================================

# GOOGLE DRIVE API

# ============================================

GOOGLE_DRIVE_FOLDER_ID="1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D"
GOOGLE_OAUTH_CLIENT_ID="[REDACTED]"
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

---
## Raw Prompt
Anda telah berada di direktori “wa-gate-tans”. Direktori ini di-initiate (telah dilakukan) dengan command:
bunx @tanstack/create-start@latest wa-gate-tans --framework solid
Saya mau buat sistem yang bisa mengakses whatsapp business saya di sistem yang saya buat ini. Nama sistemnya adalah “WA Gate – BPS Kabupaten Buton Selatan”.
Tolong migrasikan pesan template WA dan rules chat bot dari C:\laragon\www\bot-wa-pst ke repo yang baru yang saya jelaskan dibawah (folder C:\laragon\www\wa-gate-tans) (masukkan ke dalam database, dan untuk pdf yang ada ke api google drive)
Silahkan lakukan scanning folder C:\laragon\www\bot-wa-pst untuk mengambil semua informasi tentang sistem yang mau dimigrasikan, lalu muat semua informasi tersebut ke beberapa file .md di folder .ai
Sistem ini memiliki sistem login dan session
Fitur:

- Sambungkan ke akun whatsapp (berisi barcode dan keterangan informasi akun yang sudah terhubung)
- Kelola pesan wa template (beserta rule/alur chatbot pesan wa tempate)
- kelola nomor whatsapp yang akan dinotifikasi jika si pengguna chatbot ingin chat dengan manusia (petugas PST)
- kelola konten (seperti pdf, image, dan banyak lainnya) untuk pendukung pesan wa template (contohnya ada C:\laragon\www\bot-wa-pst\src\data\pdf , tolong dimigrasikan ke google drive api juga)
- kelola api key (sistem ini juga menyediakan api jika ada sistem lain ingin membaca/mengirim pesan wa)
- kelola role dan user (tabel role disimpan di database baru dengan nama table roles_wagate dan user di-consume dari database user induk)
- menu membaca dan mengirim pesan yang masuk ke akun wa (bikin ui dan ux nya mirip persis seperti https://web.whatsapp.com/)
- menu wa blast

Lakukan dulu scanning agar Anda mengetahui apa saja isi dari direktori repo baru ini.
Tech stack yang saya pilih pada proyek/direktori ini (jangan diganti):

- package manager selalu pakai bun (catat ini dalam agents.md)
- Tanstack Start
- SolidJS (sebagai UI layer)
- Typescript (sebagai bahasa pemrograman)
- Drizzle ORM
- Solid UI + Kobalte + corvu + @tanstack/solid-table
- Supabase (sebagai tempat penyimpanan database)
- cloudflare worker (sebagai tempat deploy serverless)
- penyimpanan file/dokumen (gambar, pdf, dan lain-lain) full menggunakan google drive API
- whatsapp-web.js (https://wwebjs.dev/) untuk connect ke whatsapp business

- JANGAN PERNAH PAKAI TABLE PLAIN, SELALU GUNAKAN DATATABLE. PAKAI @tanstack/solid-table DATATABLE. PAKAI SEMUA FITUR DATATABLE-NYA, SEPERTI SORT, SEARCH, FILTER, PAGINATION, DAN LAIN SEBAGAINYA

Tolong tentukan tech stack lain yang belum ditentukan dan sesuai dengan requirement system yang saya tentukan.
Berikut list link dokumentasinya (wajib dibaca dan dipahami!!!): Solid UI: https://www.solid-ui.com, dokumentasi komponen Solid UI: https://www.solid-ui.com/docs/components, repository Solid UI: https://github.com/stefan-karger/solid-ui, Kobalte overview: https://kobalte.dev/docs/core/overview/introduction, Kobalte components: https://kobalte.dev/docs/core/components, corvu docs: https://corvu.dev/docs, corvu primitives: https://corvu.dev/docs/primitives, TanStack Table Solid overview: https://tanstack.com/table/latest/docs/framework/solid, TanStack Solid Table API: https://tanstack.com/table/latest/docs/framework/solid/solid-table, TanStack column definitions: https://tanstack.com/table/latest/docs/guide/column-defs, TanStack sorting: https://tanstack.com/table/latest/docs/guide/sorting, TanStack filtering: https://tanstack.com/table/latest/docs/guide/column-filtering, TanStack global filtering: https://tanstack.com/table/latest/docs/guide/global-filtering, TanStack pagination: https://tanstack.com/table/latest/docs/guide/pagination, TanStack row selection: https://tanstack.com/table/latest/docs/guide/row-selection, TanStack column visibility: https://tanstack.com/table/latest/docs/guide/column-visibility, TanStack column sizing: https://tanstack.com/table/latest/docs/guide/column-sizing, dan TanStack virtualization: https://tanstack.com/table/latest/docs/guide/virtualization.

Requirement System:

- Tampilan ui/ux yang menarik, interaktif, modern, serta memudahkan pengguna (user friendly)
- terdapat dark/light mode
- Backend yang robust, tingkat keamanan tinggi, dan minim error.
- Scalable
- low resource (tidak memakan banyak ram, storage, prosesor, dan lain sebagainya)
- response time yang cepat
- mudah dalam development dan maintenance
- development selalu pake bun atau bunx, jangan pakai yang lain.
- Karena sistem yang dibangun menggunakan bahasa pemrograman Typesript, JANGAN PERNAH MENGGUNAKAN TYPE ANY. Tentukan tipe data agar data/variable yang diproses sistem menjadi konsisten.
- menerapkan SPA jika diperlukan untuk case tertentu
- tolong tambahkan mekanisme “typing...” ketika si pengirim mengetik pesan maupun penerima (saya sebagai pengguna sistem ini) mengetik pesan
- jangan pernah untuk push pesan dari sistem ini jika tidak pernah ada history chat dari si nomor yang dituju
- lakukan dan terapkan banyak prevention dan mekanisme agar akun whatsapp yang tertaut di sistem ini jangan sampai ter-banned oleh meta
- terapkan behavior mengirim pesan wa seperti behavior manusia, ada mekanime meniru “typing”
- jika ada wa blast (baik dilakukan dari menu, maupun dari api key), jangan dilakukan secara serentak untuk semua tujuan nomor, beri jeda 1 menit per nomor tujuan
- terapkan error prevention untuk sistem chatbot ini

PADA SETIAP TAHAPAN LAKUKAN:

- RUN BUILD DAN ESLINT AGAR TIDAK ADA ERROR DAN WARNING PADA CODE REPO
- PENCATAAN APAPUN PROGRES, KENDALA, SOLUSI DAN LAIN SEBAGAINYA PADA FILE .MD DI FILDER .ai
- SETIAP MEMULAI TAHAPAN BARU, TOLONG UNTUK BACA SEMUA FILE .MD DI FOLDER .AI AGAR TIDAK KEHILANGAN CONTEXT

Tambahkan saja

# ============================================

# CLOUDFLARE (for deployment)

# ============================================

CLOUDFLARE_ACCOUNT_ID="99ce5fef22626a0cb6328c214b8bae3f"

.env untuk database akun [username, email, password, dll. role jangan ambil dari database ini, silahkan dibikin di db supabase baru] (silahkan tarik dan pahami skema databasenya dari supabase, JANGAN ADA PENAMBAHAN ATAUPUN PERUBAHAN PADA DATABASE INI!!!):
SUPABASE_URL="https://swygqqvvwgaihqoxitbs.supabase.co"

.env untuk database baru untuk repo sistem ini (database ini sebenarnya sudah dipakai repo antrean-pst-tans, jadi tabel untuk repo ini pake nama tabel \*\*\*\_wagate, contoh: messages_wagate):
Anon public = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnp3YmJ4dXBlZXV2aHFsdWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzkxOTIsImV4cCI6MjA5NDY1NTE5Mn0.ouM7SGfMnM0TEPLxYJjesoczc4A6Rd9KKLwTv0OY-xg
service_role = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnp3YmJ4dXBlZXV2aHFsdWVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3OTE5MiwiZXhwIjoyMDk0NjU1MTkyfQ.dgb_XKjxGkQdVWtV_yLzdAMeQIu6ubGIzK0VadY_ktY

.env google drive api:
GOOGLE_DRIVE_FOLDER_ID="1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D"
GOOGLE_OAUTH_CLIENT_ID="786258523091-0er2llq119rd4bn4c4ggn0m8k0d8s165.apps.googleusercontent.com"
GOOGLE_OAUTH_REFRESH_TOKEN="[REDACTED]"

SAYA MAUNYA HASIL AKHIRNYA:

- SEMUA FUNCTIONALITY FITUR HALAMAN BERJALAN SESUAI DENGAN PROSES BISNIS YANG BENAR, TIDAK ADA ERROR, SESUAI DENGAN PROMPT DAN PERMINTAAN, DAN MEMILIKI PERFORMA YANG MUMPUNI
- REPO INI ADALAH PENYEMPURNAAN DARI REPO LAMA, MAKA DARI ITU PERBAIKI JIKA ADA CACAT LOGIC DAN CACAT TAMPILAN UI DARI REPO LAMA
- SILAHKAN PUBLISH, COMMIT, DAN PUSH SENDIRI KE GITHUB SAYA, TANPA PERLU PERSETUJUAN SAYA
- LAKUKAN PEMBANGUNAN/MIGRASI INI SAMPAI SELESAI, JANGAN HENTIKAN PROSES/PROGRES SAMPAI REPO INI BERHASIL DI PUSH, COMMIT, DAN DEPLOY
- REPO INI TERBEBAS DARI ERROR DAN WARNING DARI RUN BUILD DAN RUN ESLINT (ZERO WARNING, ZERO ERROR)
- IMPORTANT!!! BERHASIL DI DEPLOY DI DOMAIN https://wa-gate.buseldata.com
  lalu, lakukan pengecekan functionality backend melalui call api sistem dan pengecekan functionality ui/ux seperti button, sidebar, dll menggunakan agent browser.
  jangan lupa untuk memastikan ui responsive di tampilan hp (mobile). Lakukan juga QA live screenshot yntuk tampilan mobile. DAN JANGAN LUPA LAKUKAN QA LIVE UNTUK KEDUA MODE (DARK AND LIGHT MODE), JADI ADA 4 TAMPILAN YANG PERLU DI QA LIVE (TAMPILAN DEFAULT DARK MODE, TAMPILAN DEFAULT LIGHT MODE, TAMPILAN MOBILE DARK MODE, TAMPILAN MOBILE LIGHT MODE)
  lanjutkan terus secara autonomous dan continously. jangan lupa catat apapun (update pada file yang sudah ada atau buat file baru) di folder .ai, dan baca dan pahami seluruh file di folder .ai (file dalam folder .ai tidak boleh berjumlah lebih dari 10 file, jika lebih tolong di-compact kan tanpa kehilangan konteks sedikitpun, jangan ada folder (atau selain 10 file tadi) lain lagi dalam folder .ai). dan jangan lupa gunakan banyak sub agent agar projek ini cepat rampung.
