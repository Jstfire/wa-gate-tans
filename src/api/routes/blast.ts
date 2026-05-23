import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { ApiContext } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { uniquePhoneNumbers } from '../../lib/phone'
import { getWagateClient } from '../../lib/supabase-rest'
import { sendViaRuntime } from './wa-runtime'
import type { RuntimeEnv } from './wa-runtime'

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

interface ContactHistoryRow {
  phone_number: string
  has_chat_history: boolean | null
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

    const historyRows = await client.select<ContactHistoryRow>('contacts_wagate', {
      select: 'phone_number,has_chat_history',
      filter: { phone_number: `in.(${phones.join(',')})` },
    })
    const allowedPhones = new Set(
      historyRows.filter((row) => row.has_chat_history === true).map((row) => row.phone_number)
    )
    const filteredPhones = phones.filter((phone) => allowedPhones.has(phone))
    const rejectedPhones = phones.filter((phone) => !allowedPhones.has(phone))

    if (filteredPhones.length === 0) {
      return c.json({ error: 'No recipients have prior chat history', rejectedRecipients: rejectedPhones }, 400)
    }

    const [job] = await client.insert<BlastJob>('blast_jobs_wagate', {
      name: body.name.trim(),
      template_id: typeof body.templateId === 'string' ? body.templateId : null,
      message_content: body.messageContent.trim(),
      status: 'draft',
      total_recipients: filteredPhones.length,
      sent_count: 0,
      failed_count: 0,
    })

    if (!job) return c.json({ error: 'Failed to create blast job' }, 500)

    await client.insert<BlastRecipient>(
      'blast_recipients_wagate',
      filteredPhones.map((phone) => ({ job_id: job.id, phone_number: phone, status: 'pending' }))
    )

    return c.json({ ...job, accepted_recipients: filteredPhones.length, rejected_recipients: rejectedPhones }, 201)
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

function nextAllowedSendAt(lastSentAt: string | null): Date {
  const base = lastSentAt ? new Date(lastSentAt).getTime() : 0
  const jitterSeconds = 60 + Math.floor(Math.random() * 31)
  return new Date(base + jitterSeconds * 1000)
}

function nowIso(): string {
  return new Date().toISOString()
}

async function refreshJobCounts(jobId: string): Promise<BlastJob | null> {
  const client = getWagateClient()
  const recipients = await client.select<BlastRecipient>('blast_recipients_wagate', {
    select: 'id,status',
    filter: { job_id: `eq.${jobId}` },
    limit: 1000,
  })
  const sent = recipients.filter((recipient) => recipient.status === 'sent').length
  const failed = recipients.filter((recipient) => recipient.status === 'failed').length
  const pending = recipients.filter((recipient) => recipient.status === 'pending' || recipient.status === 'sending').length
  const status = pending === 0 ? 'completed' : 'running'
  const [updated] = await client.update<BlastJob>('blast_jobs_wagate', {
    sent_count: sent,
    failed_count: failed,
    status,
    completed_at: status === 'completed' ? nowIso() : null,
    updated_at: nowIso(),
  }, { id: `eq.${jobId}` })
  return updated ?? null
}

export async function processBlastQueue(env?: RuntimeEnv): Promise<{ processed: boolean; reason?: string; jobId?: string; recipientId?: string }> {
  const client = getWagateClient()
  const jobs = await client.select<BlastJob>('blast_jobs_wagate', {
    filter: { status: 'in.(queued,running)' },
    order: 'started_at.asc.nullsfirst,created_at.asc',
    limit: 1,
  })
  const job = jobs[0]
  if (!job) return { processed: false, reason: 'no queued/running job' }

  const lastSent = await client.select<BlastRecipient>('blast_recipients_wagate', {
    select: 'id,sent_at,status,job_id,phone_number,error_message,created_at',
    filter: { job_id: `eq.${job.id}`, status: 'eq.sent' },
    order: 'sent_at.desc',
    limit: 1,
  })
  const allowedAt = nextAllowedSendAt(lastSent[0]?.sent_at ?? job.started_at)
  if (Date.now() < allowedAt.getTime()) {
    await updateStatus(job.id, 'running')
    return { processed: false, reason: `waiting until ${allowedAt.toISOString()}`, jobId: job.id }
  }

  const recipients = await client.select<BlastRecipient>('blast_recipients_wagate', {
    filter: { job_id: `eq.${job.id}`, status: 'eq.pending' },
    order: 'created_at.asc',
    limit: 1,
  })
  const recipient = recipients[0]
  if (!recipient) {
    await refreshJobCounts(job.id)
    return { processed: false, reason: 'job completed', jobId: job.id }
  }

  await updateStatus(job.id, 'running')
  await client.update<BlastRecipient>('blast_recipients_wagate', { status: 'sending', updated_at: nowIso() }, { id: `eq.${recipient.id}` })

  try {
    const sent = await sendViaRuntime(recipient.phone_number, job.message_content, env)
    if (!sent.success) throw new Error(sent.error ?? 'Runtime send failed')
    await client.update<BlastRecipient>('blast_recipients_wagate', {
      status: 'sent',
      sent_at: nowIso(),
      error_message: null,
      updated_at: nowIso(),
    }, { id: `eq.${recipient.id}` })
  } catch (error) {
    await client.update<BlastRecipient>('blast_recipients_wagate', {
      status: 'failed',
      error_message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown send error',
      updated_at: nowIso(),
    }, { id: `eq.${recipient.id}` })
  }

  await refreshJobCounts(job.id)
  return { processed: true, jobId: job.id, recipientId: recipient.id }
}

export default blast
