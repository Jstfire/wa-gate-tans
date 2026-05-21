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
CLOUDFLARE_API_TOKEN="[REDACTED]"

.env untuk database akun [username, email, password, dll. role jangan ambil dari database ini, silahkan dibikin di db supabase baru] (silahkan tarik dan pahami skema databasenya dari supabase, JANGAN ADA PENAMBAHAN ATAUPUN PERUBAHAN PADA DATABASE INI!!!):
DATABASE_URL="postgresql://postgres.swygqqvvwgaihqoxitbs:DDkzwkKwDEZQ6b5A@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.swygqqvvwgaihqoxitbs:DDkzwkKwDEZQ6b5A@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="CnZr9REaNTMW6GOCbo7QkrLn3tQ5lG8McrX9HoPSg63XqTjIXhy6AgJttS8qs298"
SUPABASE_URL="https://swygqqvvwgaihqoxitbs.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eWdxcXZ2d2dhaWhxb3hpdGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTcxMTUsImV4cCI6MjA3MDQ3MzExNX0.368HCo-UbNPsB0-I0U_L1gkM4CwgQNQiLAFmxHM3Zz8"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eWdxcXZ2d2dhaWhxb3hpdGJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg5NzExNSwiZXhwIjoyMDcwNDczMTE1fQ.0jUjIxMzAk1kOD5zMxMuDbp1o-bbExm4tshQDX2ZE4o"

.env untuk database baru untuk repo sistem ini (database ini sebenarnya sudah dipakai repo antrean-pst-tans, jadi tabel untuk repo ini pake nama tabel \*\*\*\_wagate, contoh: messages_wagate):
DATABASE_URL="postgresql://postgres.pmfzwbbxupeeuvhqluea:%%ek0nomi0108@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
Anon public = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnp3YmJ4dXBlZXV2aHFsdWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzkxOTIsImV4cCI6MjA5NDY1NTE5Mn0.ouM7SGfMnM0TEPLxYJjesoczc4A6Rd9KKLwTv0OY-xg
service_role = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZnp3YmJ4dXBlZXV2aHFsdWVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA3OTE5MiwiZXhwIjoyMDk0NjU1MTkyfQ.dgb_XKjxGkQdVWtV_yLzdAMeQIu6ubGIzK0VadY_ktY

.env google drive api:
GOOGLE_DRIVE_FOLDER_ID="1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D"
GOOGLE_OAUTH_CLIENT_ID="786258523091-0er2llq119rd4bn4c4ggn0m8k0d8s165.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="[REDACTED]"
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
