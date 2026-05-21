# Agent Guidelines - WA Gate BPS Buton Selatan

## Critical Rules

### Package Manager
**WAJIB**: Selalu gunakan `bun` atau `bunx`
**TIDAK BOLEH**: npm, yarn, pnpm, npx

```bash
# ✅ CORRECT
bun install
bun add package-name
bun run dev
bunx command

# ❌ WRONG
npm install
yarn add package-name
pnpm install
npx command
```

### TypeScript
**WAJIB**: Tentukan tipe eksplisit
**TIDAK BOLEH**: Gunakan `type any`

```typescript
// ✅ CORRECT
const data: UserData = await fetchUser()
function process(input: string): number { }

// ❌ WRONG
const data: any = await fetchUser()
function process(input: any): any { }
```

### Tables
**WAJIB**: Gunakan @tanstack/solid-table dengan semua fitur
**TIDAK BOLEH**: Plain HTML table

```tsx
// ✅ CORRECT
import { createSolidTable } from '@tanstack/solid-table'
const table = createSolidTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
})

// ❌ WRONG
<table>
  <tr><td>Plain table</td></tr>
</table>
```

### Database Tables
**WAJIB**: Semua tabel suffix `_wagate`
**TIDAK BOLEH**: Modifikasi database induk

```typescript
// ✅ CORRECT
export const messages_wagate = pgTable('messages_wagate', { })
export const roles_wagate = pgTable('roles_wagate', { })

// ❌ WRONG
export const messages = pgTable('messages', { })
export const users = pgTable('users', { }) // DB induk READ-ONLY!
```

### WA Blast
**WAJIB**: Jeda random 60-90 detik per nomor
**TIDAK BOLEH**: Kirim serentak

```typescript
// ✅ CORRECT
const delay = Math.floor(Math.random() * (90000 - 60000 + 1)) + 60000
await sleep(delay)
await sendMessage(number, message)

// ❌ WRONG
await Promise.all(numbers.map(n => sendMessage(n, message)))
```

### Human-like Behavior
**WAJIB**: Simulasi typing sebelum kirim
**TIDAK BOLEH**: Kirim langsung tanpa delay

```typescript
// ✅ CORRECT
await chat.sendStateTyping()
const typingDuration = calculateTypingDuration(message.length)
await sleep(typingDuration)
await chat.clearState()
await sleep(randomDelay(1000, 3000))
await sendMessage(message)

// ❌ WRONG
await sendMessage(message)
```

### Build & Lint
**WAJIB**: Zero error, zero warning setiap tahapan
**TIDAK BOLEH**: Commit dengan error/warning

```bash
# Run setelah setiap perubahan
bun run build
bun run lint

# Harus output:
# ✓ Build successful
# ✓ No linting errors
```

## Development Workflow

### 1. Before Starting
```bash
cd /mnt/c/laragon/www/wa-gate-tans
bun install
```

### 2. During Development
```bash
# Terminal 1: Dev server
bun run dev

# Terminal 2: Type checking
bun run tsc --watch

# Terminal 3: Linting
bun run lint --watch
```

### 3. Before Commit
```bash
bun run build
bun run lint
bun run test
```

### 4. Deployment
```bash
bun run build
bun run deploy
```

## Sub-agent Delegation

### When to Delegate
- Complex feature implementation (>5 files)
- Database migration tasks
- API endpoint creation (multiple endpoints)
- UI component development (multiple pages)
- Testing & QA

### How to Delegate
```typescript
// Example delegation
delegate_task({
  goal: "Implement WA Blast Engine with queue system",
  context: `
    - Use blast_jobs_wagate and blast_recipients_wagate tables
    - Random delay 60-90 seconds between sends
    - Support pause/resume
    - Track status per recipient
  `,
  toolsets: ['terminal', 'file', 'web']
})
```

### Parallel Tasks
- Frontend + Backend development
- Database setup + API development
- UI components + Testing
- Migration + Documentation

## Context Management (.ai folder)

### Rules
- **Maximum**: 10 files .md
- **No subfolders**: Flat structure only
- **Compact**: Merge jika >10 files tanpa kehilangan konteks

### Required Files
1. `01-progress.md` - Progress tracking
2. `02-techstack.md` - Tech stack decisions
3. `03-schema.md` - Database schema
4. `04-migration.md` - Migration plan
5. `05-agents.md` - Agent guidelines (this file)
6. `06-api-docs.md` - API documentation
7. `07-deployment.md` - Deployment guide
8. `08-issues.md` - Issues & solutions
9. `09-qa.md` - QA checklist & screenshots
10. `10-notes.md` - Additional notes

### Update Frequency
- **Every task completion**: Update progress.md
- **Every issue found**: Update issues.md
- **Every decision made**: Update relevant .md
- **Before starting new phase**: Read ALL .md files

## Quality Standards

### Code Quality
- TypeScript strict mode enabled
- ESLint rules enforced
- Prettier formatting applied
- No console.log in production
- Comprehensive error handling

### Performance
- API response < 200ms
- Page load < 2s
- Bundle size < 500KB gzipped
- Memory usage < 128MB

### Security
- JWT for authentication
- API key validation
- Rate limiting enabled
- Input sanitization
- SQL injection prevention

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators

## Testing Requirements

### Unit Tests
- All utility functions
- All API endpoints
- All database queries

### Integration Tests
- WA connection flow
- Chatbot conversation flow
- Blast job execution
- File upload/download

### E2E Tests
- Login flow
- Send message flow
- Create blast job flow
- Admin operations

### Manual QA
- Desktop dark mode
- Desktop light mode
- Mobile dark mode (~390px)
- Mobile light mode (~390px)
