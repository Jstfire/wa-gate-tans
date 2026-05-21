import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../db'
import { blast_jobs_wagate, blast_recipients_wagate } from '../../db/schema'
import { authMiddleware  } from '../middleware/auth'
import type {ApiContext} from '../middleware/auth';
import { requirePermission } from '../middleware/permission'
import { uniquePhoneNumbers } from '../../lib/phone'

const blast = new Hono()

blast.use('*', authMiddleware)

// GET /blast — list blast jobs with pagination
blast.get('/', requirePermission('wa_blast'), async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
    const offset = (page - 1) * limit

    const rows = await db.select().from(blast_jobs_wagate)
      .orderBy(desc(blast_jobs_wagate.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({ data: rows, page, limit })
  } catch {
    return c.json({ error: 'Failed to fetch blast jobs' }, 500)
  }
})

// GET /blast/:id — get blast job detail with recipients
blast.get('/:id', requirePermission('wa_blast'), async (c) => {
  try {
    const id = c.req.param('id') as string
    const [job] = await db.select().from(blast_jobs_wagate)
      .where(eq(blast_jobs_wagate.id, id))
      .limit(1)

    if (!job) return c.json({ error: 'Blast job not found' }, 404)

    const recipients = await db.select().from(blast_recipients_wagate)
      .where(eq(blast_recipients_wagate.jobId, id))
      .orderBy(desc(blast_recipients_wagate.createdAt))

    return c.json({ ...job, recipients })
  } catch {
    return c.json({ error: 'Failed to fetch blast job' }, 500)
  }
})

// POST /blast — create new blast job
blast.post('/', requirePermission('wa_blast'), async (c: ApiContext) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()

    if (typeof body.name !== 'string' || !body.name.trim()) {
      return c.json({ error: 'Field "name" is required' }, 400)
    }
    if (typeof body.messageContent !== 'string' || !body.messageContent.trim()) {
      return c.json({ error: 'Field "messageContent" is required' }, 400)
    }
    if (!Array.isArray(body.recipients) || body.recipients.length === 0) {
      return c.json({ error: 'Field "recipients" must be a non-empty array of phone numbers' }, 400)
    }

    const phones = uniquePhoneNumbers(body.recipients.map(String))
    if (phones.length === 0) {
      return c.json({ error: 'No valid phone numbers provided' }, 400)
    }

    const [job] = await db.insert(blast_jobs_wagate).values({
      name: body.name.trim(),
      templateId: typeof body.templateId === 'string' ? body.templateId : undefined,
      messageContent: body.messageContent.trim(),
      status: 'draft',
      totalRecipients: phones.length,
      sentCount: 0,
      failedCount: 0,
      createdBy: user.id,
    }).returning()

    // Insert recipients
    const recipientRows = phones.map((phone) => ({
      jobId: job.id,
      phoneNumber: phone,
      status: 'pending' as const,
    }))

    await db.insert(blast_recipients_wagate).values(recipientRows)

    return c.json(job, 201)
  } catch {
    return c.json({ error: 'Failed to create blast job' }, 500)
  }
})

// POST /blast/:id/start — change status to 'queued'
blast.post('/:id/start', requirePermission('wa_blast'), async (c) => {
  try {
    const id = c.req.param('id') as string
    const [job] = await db.select().from(blast_jobs_wagate)
      .where(eq(blast_jobs_wagate.id, id)).limit(1)

    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status !== 'draft') {
      return c.json({ error: `Cannot start job with status "${job.status}"` }, 400)
    }

    const [updated] = await db.update(blast_jobs_wagate)
      .set({ status: 'queued', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(blast_jobs_wagate.id, id))
      .returning()

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to start blast job' }, 500)
  }
})

// POST /blast/:id/pause — change status to 'paused'
blast.post('/:id/pause', requirePermission('wa_blast'), async (c) => {
  try {
    const id = c.req.param('id') as string
    const [job] = await db.select().from(blast_jobs_wagate)
      .where(eq(blast_jobs_wagate.id, id)).limit(1)

    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status !== 'queued' && job.status !== 'running') {
      return c.json({ error: `Cannot pause job with status "${job.status}"` }, 400)
    }

    const [updated] = await db.update(blast_jobs_wagate)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(blast_jobs_wagate.id, id))
      .returning()

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to pause blast job' }, 500)
  }
})

// POST /blast/:id/resume — change status to 'queued'
blast.post('/:id/resume', requirePermission('wa_blast'), async (c) => {
  try {
    const id = c.req.param('id') as string
    const [job] = await db.select().from(blast_jobs_wagate)
      .where(eq(blast_jobs_wagate.id, id)).limit(1)

    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status !== 'paused') {
      return c.json({ error: `Cannot resume job with status "${job.status}"` }, 400)
    }

    const [updated] = await db.update(blast_jobs_wagate)
      .set({ status: 'queued', updatedAt: new Date() })
      .where(eq(blast_jobs_wagate.id, id))
      .returning()

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to resume blast job' }, 500)
  }
})

// POST /blast/:id/cancel — change status to 'cancelled'
blast.post('/:id/cancel', requirePermission('wa_blast'), async (c) => {
  try {
    const id = c.req.param('id') as string
    const [job] = await db.select().from(blast_jobs_wagate)
      .where(eq(blast_jobs_wagate.id, id)).limit(1)

    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status === 'completed' || job.status === 'cancelled') {
      return c.json({ error: `Cannot cancel job with status "${job.status}"` }, 400)
    }

    const [updated] = await db.update(blast_jobs_wagate)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(blast_jobs_wagate.id, id))
      .returning()

    return c.json(updated)
  } catch {
    return c.json({ error: 'Failed to cancel blast job' }, 500)
  }
})

export default blast
