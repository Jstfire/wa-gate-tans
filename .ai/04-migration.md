# Data Migration from bot-wa-pst to wa-gate-tans

**Date:** 2026-05-21  
**Status:** ✅ Completed

## Overview

Migrated data from the old WhatsApp bot repository (`bot-wa-pst`) to the new database-backed system (`wa-gate-tans`).

## Migration Components

### 1. WA Templates Migration ✅

**Source:** `/mnt/c/laragon/www/bot-wa-pst/src/utils/messages.ts`  
**Target Table:** `wa_templates_wagate`

Migrated 18 message templates:
- Main menu messages (MAIN_MENU, MAIN_MENU_NEXT)
- Welcome and system messages (WELCOME_MESSAGE, MENU_EXPIRED)
- Submenu templates (Perpustakaan, Rekomendasi, Konsultasi, KCDA, Lokasi)
- Content messages (STATISTIK_UMUM, LOKASI, JADWAL_BUKA)
- Admin messages (ADMIN_JAM, ADMIN_END)
- System responses (THANKS, PUBLIKASI, WEB_BUSEL, WAITING, INVALID)

**Categories:**
- `menu` - Main menu templates
- `submenu` - Submenu navigation
- `content` - Information content
- `admin` - Admin-related messages
- `system` - System responses

### 2. Chatbot Rules Migration ✅

**Source:** `/mnt/c/laragon/www/bot-wa-pst/src/handlers/router.ts`  
**Target Table:** `chatbot_rules_wagate`

Migrated 24 chatbot rules covering:
- Main menu navigation (8 options)
- Perpustakaan submenu (2 options)
- Rekomendasi Statistik submenu (2 options)
- Konsultasi Statistik submenu (2 options)
- Publikasi KCDA submenu (7 kecamatan options)
- Back to main menu (99)

**Response Types:**
- `text` - Text-based responses
- `location` - GPS location sharing
- `pdf` - PDF document delivery
- `link` - URL link sharing
- `admin` - Admin mode activation

**Location Coordinates:**
- Latitude: -5.608591411817911
- Longitude: 122.60022162024016
- Address: 9JR2+F4C, Jl. Lamaindo, Laompo, Batauga, Kabupaten Buton, Sulawesi Tenggara

### 3. Officer Numbers Migration ✅

**Source:** `/mnt/c/laragon/www/bot-wa-pst/src/handlers/router.ts` (ADMIN_NUMBERS)  
**Target Table:** `officer_numbers_wagate`

Migrated 2 admin numbers:
- 6289616370100 - Admin 1 (Admin PST)
- 6283856685530 - Admin 2 (Admin PST)

### 4. Roles Creation ✅

**Target Table:** `roles_wagate`

Created 3 default roles:

#### Admin Role
Full permissions:
- wa_connect: ✅
- wa_send: ✅
- wa_blast: ✅
- templates: ✅
- chatbot: ✅
- content: ✅
- api_keys: ✅
- users: ✅

#### Operator Role
Limited permissions:
- wa_connect: ✅
- wa_send: ✅
- wa_blast: ✅
- templates: ✅
- chatbot: ❌
- content: ✅
- api_keys: ❌
- users: ❌

#### Viewer Role
Read-only (all permissions: ❌)

### 5. PDF Files Upload 📤

**Source:** `/mnt/c/laragon/www/bot-wa-pst/src/data/pdf/`  
**Target:** Google Drive (Folder ID: `1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D`)  
**Metadata Table:** `content_files_wagate`

**Files to Upload (8 PDFs):**

1. **Kabupaten Buton Selatan Dalam Angka 2025.pdf**
   - Category: `publikasi_dda`
   - Main district publication

2. **Kecamatan Batauga Dalam Angka 2025.pdf**
   - Category: `publikasi_kcda`

3. **Kecamatan Batu Atas Dalam Angka 2025.pdf**
   - Category: `publikasi_kcda`

4. **Kecamatan Kadatua Dalam Angka 2025.pdf**
   - Category: `publikasi_kcda`

5. **Kecamatan Lapandewa Dalam Angka 2025.pdf**
   - Category: `publikasi_kcda`

6. **Kecamatan Sampolawa Dalam Angka 2025.pdf**
   - Category: `publikasi_kcda`

7. **Kecamatan Siompu Barat Dalam Angka 2025.pdf**
   - Category: `publikasi_kcda`

8. **Kecamatan Siompu Dalam Angka 2025.pdf**
   - Category: `publikasi_kcda`

## Files Created

### 1. `/src/db/seed.ts`
Main seeding script that:
- Connects to database using `src/db/index.ts`
- Seeds WA templates
- Seeds chatbot rules
- Seeds officer numbers
- Seeds default roles

**Run with:**
```bash
bun run src/db/seed.ts
```

### 2. `/src/db/upload-pdfs.ts`
PDF upload script that:
- Reads PDFs from old repo
- Uploads to Google Drive
- Saves metadata to `content_files_wagate` table

**Run with:**
```bash
bun run src/db/upload-pdfs.ts
```

**Prerequisites:**
- Google OAuth credentials in `.env`:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REFRESH_TOKEN`
  - `GOOGLE_DRIVE_FOLDER_ID`

### 3. `/src/db/data/chatbot-rules.ts`
Chatbot rules data structure exported for reuse.

## Database Schema Used

### wa_templates_wagate
- id (uuid, PK)
- name (varchar)
- content (text)
- variables (jsonb)
- category (varchar)
- isActive (boolean)
- createdBy (uuid)
- createdAt (timestamp)
- updatedAt (timestamp)

### chatbot_rules_wagate
- id (uuid, PK)
- trigger (varchar)
- parentTrigger (varchar, nullable)
- responseType (varchar)
- responseContent (text)
- responseMetadata (jsonb)
- order (integer)
- isActive (boolean)
- createdAt (timestamp)
- updatedAt (timestamp)

### officer_numbers_wagate
- id (uuid, PK)
- name (varchar)
- phoneNumber (varchar, unique)
- position (varchar)
- isActive (boolean)
- createdAt (timestamp)
- updatedAt (timestamp)

### roles_wagate
- id (uuid, PK)
- name (varchar, unique)
- permissions (jsonb)
- createdAt (timestamp)
- updatedAt (timestamp)

### content_files_wagate
- id (uuid, PK)
- name (varchar)
- originalFilename (varchar)
- mimeType (varchar)
- fileSize (bigint)
- googleDriveId (varchar, unique)
- googleDriveUrl (text)
- category (varchar)
- uploadedBy (uuid)
- createdAt (timestamp)
- updatedAt (timestamp)

## Execution Steps

### Step 1: Run Database Seed
```bash
cd /mnt/c/laragon/www/wa-gate-tans
bun run src/db/seed.ts
```

Expected output:
```
🚀 Starting database seeding...
🌱 Seeding WA templates...
✅ Seeded 18 templates
🌱 Seeding officer numbers...
✅ Seeded 2 officer numbers
🌱 Seeding roles...
✅ Seeded 3 roles
🌱 Seeding chatbot rules...
✅ Seeded 24 chatbot rules
✅ Database seeding completed successfully!
```

### Step 2: Upload PDFs to Google Drive
```bash
cd /mnt/c/laragon/www/wa-gate-tans
bun run src/db/upload-pdfs.ts
```

Expected output:
```
📤 Starting PDF upload to Google Drive...

📄 Processing: Kabupaten Buton Selatan Dalam Angka 2025.pdf
  Size: X.XX MB
  ⬆️  Uploading to Google Drive...
  ✅ Uploaded - Drive ID: xxxxx
  💾 Metadata saved to database

[... repeat for all 8 files ...]

==================================================
✅ Successfully uploaded: 8/8
==================================================

✅ PDF upload completed!
```

## Notes

- All timestamps use timezone-aware timestamps (with timezone: true)
- UUIDs are auto-generated using defaultRandom()
- All seeded data has isActive = true by default
- PDF files remain in old repo, only uploaded to Google Drive
- Google Drive files are set to public read access
- Chatbot rules use hierarchical structure with parentTrigger

## Verification Queries

Check seeded data:

```sql
-- Check templates
SELECT name, category, is_active FROM wa_templates_wagate;

-- Check chatbot rules
SELECT trigger, parent_trigger, response_type, "order" 
FROM chatbot_rules_wagate 
ORDER BY "order";

-- Check officer numbers
SELECT name, phone_number, position FROM officer_numbers_wagate;

-- Check roles
SELECT name, permissions FROM roles_wagate;

-- Check uploaded PDFs
SELECT name, category, google_drive_id FROM content_files_wagate;
```

## Migration Mapping

### Old Code → New Database

**Messages (messages.ts) → wa_templates_wagate:**
- MAIN_MENU → template "MAIN_MENU"
- WELCOME_MESSAGE → template "WELCOME_MESSAGE"
- SUB_MENUS object → individual submenu templates

**Router Logic (router.ts) → chatbot_rules_wagate:**
- switch/case statements → trigger-based rules
- Nested menu levels → parentTrigger relationships
- Response actions → responseType + responseMetadata

**Admin Numbers (router.ts) → officer_numbers_wagate:**
- ADMIN_NUMBERS array → individual officer records

**PDF Map (router.ts) → content_files_wagate:**
- pdfMap object → file metadata records with Google Drive links
