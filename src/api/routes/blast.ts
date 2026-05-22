import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { ApiContext } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { uniquePhoneNumbers } from '../../lib/phone'
import { getWagateClient } from '../../lib/supabase-rest'

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[]

interface BlastJob {
  id: string
  name: string
  template_id: string | null
  message_content: string
  status: string
  total_recipients: number
  sent_count: number
  failed_count: number
  created_by: string
  created_at: string
  updated_at: string | null
  started_at: string | null
  completed_at: string | null
}

interface BlastRecipient {
  id: string
  job_id: string
  phone_number: string
  status: string
  sent_at: string | null
  error_message: string | null
  created_at: string
}

const blast = new Hono()

blast.use('*', authMiddleware)

blast.get('/', requirePermission('wa_blast'), async (c) => {
  try {
    const client = getWagateClient()
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
    const offset = (page - 1) * limit

    const rows = await client.select<BlastJob>('blast_jobs_wagate', {
      order: 'created_at.desc',
      limit,
      offset,
    })

    return c.json({ data: rows, page, limit })
  } catch {
    return c.json({ error: 'Failed to fetch blast jobs' }, 500)
  }
})

blast.post('/', requirePermission('wa_blast'), async (c: ApiContext) => {
  try {
    const client = getWagateClient()
    const user = c.get('user')
    const body = await c.req.json<Record<string, unknown>>()

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

    const [job] = await client.insert<BlastJob>('blast_jobs_wagate', {
      name: body.name.trim(),
      template_id: typeof body.templateId === 'string' ? body.templateId : null,
      message_content: body.messageContent.trim(),
      status: 'draft',
      total_recipients: phones.length,
      sent_count: 0,
      failed_count: 0,
    })

    if (!job) return c.json({ error: 'Failed to create blast job' }, 500)

    await client.insert<BlastRecipient>(
      'blast_recipients_wagate',
      phones.map((phone) => ({ job_id: job.id, phone_number: phone, status: 'pending' }))
    )

    return c.json(job, 201)
  } catch {
    return c.json({ error: 'Failed to create blast job' }, 500)
  }
})

blast.get('/:id', requirePermission('wa_blast'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id') ?? ''
    const job = await client.selectOne<BlastJob>('blast_jobs_wagate', { filter: { id: `eq.${id}` } })

    if (!job) return c.json({ error: 'Blast job not found' }, 404)

    const recipients = await client.select<BlastRecipient>('blast_recipients_wagate', {
      filter: { job_id: `eq.${id}` },
      order: 'created_at.desc',
    })

    return c.json({ ...job, recipients })
  } catch {
    return c.json({ error: 'Failed to fetch blast job' }, 500)
  }
})

async function updateStatus(id: string, status: string, extra: Record<string, JsonValue> = {}): Promise<BlastJob | null> {
  const client = getWagateClient()
  const [updated] = await client.update<BlastJob>('blast_jobs_wagate', {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  }, { id: `eq.${id}` })
  return updated ?? null
}

blast.post('/:id/start', requirePermission('wa_blast'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id') ?? ''
    const job = await client.selectOne<BlastJob>('blast_jobs_wagate', { filter: { id: `eq.${id}` } })
    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status !== 'draft') return c.json({ error: `Cannot start job with status "${job.status}"` }, 400)
    return c.json(await updateStatus(id, 'queued', { started_at: new Date().toISOString() }))
  } catch {
    return c.json({ error: 'Failed to start blast job' }, 500)
  }
})

blast.post('/:id/pause', requirePermission('wa_blast'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id') ?? ''
    const job = await client.selectOne<BlastJob>('blast_jobs_wagate', { filter: { id: `eq.${id}` } })
    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status !== 'queued' && job.status !== 'running') return c.json({ error: `Cannot pause job with status "${job.status}"` }, 400)
    return c.json(await updateStatus(id, 'paused'))
  } catch {
    return c.json({ error: 'Failed to pause blast job' }, 500)
  }
})

blast.post('/:id/resume', requirePermission('wa_blast'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id') ?? ''
    const job = await client.selectOne<BlastJob>('blast_jobs_wagate', { filter: { id: `eq.${id}` } })
    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status !== 'paused') return c.json({ error: `Cannot resume job with status "${job.status}"` }, 400)
    return c.json(await updateStatus(id, 'queued'))
  } catch {
    return c.json({ error: 'Failed to resume blast job' }, 500)
  }
})

blast.post('/:id/cancel', requirePermission('wa_blast'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id') ?? ''
    const job = await client.selectOne<BlastJob>('blast_jobs_wagate', { filter: { id: `eq.${id}` } })
    if (!job) return c.json({ error: 'Blast job not found' }, 404)
    if (job.status === 'completed' || job.status === 'cancelled') return c.json({ error: `Cannot cancel job with status "${job.status}"` }, 400)
    return c.json(await updateStatus(id, 'cancelled'))
  } catch {
    return c.json({ error: 'Failed to cancel blast job' }, 500)
  }
})

blast.get('/:id/recipients', requirePermission('wa_blast'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id') ?? ''
    const recipients = await client.select<BlastRecipient>('blast_recipients_wagate', {
      filter: { job_id: `eq.${id}` },
      order: 'created_at.desc',
    })
    return c.json({ data: recipients })
  } catch {
    return c.json({ error: 'Failed to fetch blast recipients' }, 500)
  }
})

export default blast
