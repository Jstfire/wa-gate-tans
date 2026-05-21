# Tech Stack - WA Gate BPS Buton Selatan

## Core Stack (TIDAK BOLEH DIGANTI)

### Frontend
- **Framework**: TanStack Start + SolidJS
- **Language**: TypeScript (TIDAK BOLEH type any)
- **UI Components**: 
  - Solid UI (https://www.solid-ui.com)
  - Kobalte (https://kobalte.dev)
  - corvu (https://corvu.dev)
  - @tanstack/solid-table (WAJIB untuk semua tabel)
- **Styling**: Tailwind CSS

### Backend
- **Runtime**: Node.js
- **ORM**: Drizzle ORM
- **Database**: Supabase (PostgreSQL)
  - DB Induk (READ-ONLY): User authentication
  - DB Baru: Tabel dengan suffix _wagate
- **File Storage**: Google Drive API
- **WA Connection**: whatsapp-web.js (https://wwebjs.dev/)

### Deployment
- **Platform**: Cloudflare Workers
- **Package Manager**: bun/bunx (WAJIB, TIDAK BOLEH npm/yarn/pnpm)

## Additional Stack (Ditentukan)

### State Management
- SolidJS Signals (built-in)
- @tanstack/solid-query untuk data fetching

### Form Validation
- Zod untuk schema validation
- @modular-forms/solid untuk form handling

### Authentication
- JWT untuk session management
- bcrypt untuk password hashing

### API
- Hono.js untuk API routes (compatible dengan Cloudflare Workers)
- CORS middleware

### Development Tools
- ESLint untuk linting
- Prettier untuk formatting
- TypeScript strict mode

### WA Blast Engine
- Custom queue system dengan tabel blast_jobs_wagate dan blast_recipients_wagate
- Random delay 60-90 detik per nomor
- Human-like typing simulation

### Anti-ban Mechanisms
- Rate limiting per jam dan per hari
- Exponential backoff untuk reconnect
- TIDAK kirim ke nomor tanpa history chat
- Human-like behavior simulation

## Dependencies to Install

```bash
# Core dependencies
bun add @tanstack/solid-query
bun add drizzle-orm postgres
bun add @supabase/supabase-js
bun add whatsapp-web.js
bun add qrcode
bun add googleapis
bun add hono
bun add jose # untuk JWT
bun add zod
bun add @modular-forms/solid

# Dev dependencies
bun add -D drizzle-kit
bun add -D @types/node
```

## Architecture Decisions

### Database Strategy
- **Dual Connection**: 
  - Connection 1: DB Induk (READ-ONLY) untuk user authentication
  - Connection 2: DB Baru untuk semua tabel _wagate
- **Naming Convention**: Semua tabel suffix _wagate
- **Migration**: Drizzle Kit

### File Storage Strategy
- **Primary**: Google Drive API
- **Metadata**: Disimpan di tabel content_files_wagate
- **Upload Flow**: File → Google Drive → Save metadata to DB

### WA Connection Strategy
- **Library**: whatsapp-web.js (bukan @whiskeysockets/baileys)
- **Session**: Persistent session storage
- **QR Code**: Generate untuk scan
- **Reconnect**: Automatic dengan exponential backoff

### API Strategy
- **Framework**: Hono.js (lightweight, CF Workers compatible)
- **Authentication**: JWT Bearer token
- **Rate Limiting**: Per endpoint
- **Error Handling**: Centralized error handler

### Blast Engine Strategy
- **Queue System**: Database-based queue
- **Delay**: Random 60-90 detik per nomor
- **Typing Simulation**: 200-300 karakter/menit + random ±20%
- **Pause/Resume**: Supported
- **Status Tracking**: Per-recipient status

## Performance Targets
- **Response Time**: < 200ms untuk API calls
- **Build Time**: < 2 menit
- **Bundle Size**: < 500KB (gzipped)
- **Memory Usage**: < 128MB (Cloudflare Workers limit)
