import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import type { ApiContext } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getWagateClient } from '../../lib/supabase-rest'

interface ContentFile {
  id: string
  name: string
  original_filename: string
  mime_type: string
  file_size: number
  google_drive_id: string
  google_drive_url: string
  category: string | null
  uploaded_by: string
  created_at: string
  updated_at: string | null
}

const content = new Hono()

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED_MIME_PREFIXES = ['application/pdf', 'image/', 'application/msword', 'application/vnd.openxmlformats-officedocument']

function isAllowedContentMime(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime === prefix || mime.startsWith(prefix))
}

function cleanOptionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 255) : null
}

content.use('*', authMiddleware)

content.get('/', requirePermission('content'), async (c) => {
  try {
    const client = getWagateClient()
    const rows = await client.select<ContentFile>('content_files_wagate', { order: 'created_at.desc' })
    return c.json({ data: rows })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return c.json({ error: 'Failed to fetch content files', detail: msg }, 500)
  }
})

content.get('/drive/status', requirePermission('content'), async (c) => {
  try {
    const { getGoogleDriveClient } = await import('../../lib/google-drive')
    const driveClient = getGoogleDriveClient(c.env as Record<string, string | undefined>)
    const result = await driveClient.verifyConnection()
    return c.json({ ok: true, ...result })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return c.json({ ok: false, error: 'Google Drive connection failed', detail }, 503)
  }
})

content.post('/upload', requirePermission('content'), async (c: ApiContext) => {
  try {
    const client = getWagateClient()
    const user = c.get('user')
    const formData = await c.req.formData()
    const file = formData.get('file')
    const category = cleanOptionalText(formData.get('category'))
    const displayName = cleanOptionalText(formData.get('name'))

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'File is required' }, 400)
    }

    const mimeType = file.type || 'application/octet-stream'
    if (!isAllowedContentMime(mimeType)) {
      return c.json({ error: 'Unsupported file type', allowed: 'PDF, image, Word, and Office document files only' }, 400)
    }

    if (file.size <= 0) return c.json({ error: 'File is empty' }, 400)
    if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: 'File too large', maxBytes: MAX_UPLOAD_BYTES }, 413)

    let driveClient: { uploadFile: (name: string, mime: string, buffer: Buffer) => Promise<{ id: string; url: string }> }
    try {
      const { getGoogleDriveClient } = await import('../../lib/google-drive')
      driveClient = getGoogleDriveClient(c.env as Record<string, string | undefined>)
    } catch {
      return c.json({ error: 'Google Drive not configured' }, 503)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await driveClient.uploadFile(
      file.name,
      mimeType,
      buffer
    )

    const [row] = await client.insert<ContentFile>('content_files_wagate', {
      name: displayName ?? file.name.replace(/\.[^.]+$/, ''),
      original_filename: file.name,
      mime_type: mimeType,
      file_size: buffer.length,
      google_drive_id: uploadResult.id,
      google_drive_url: uploadResult.url,
      category,
      uploaded_by: user.id,
    })

    return c.json(row, 201)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error('Content upload error:', detail)
    return c.json({ error: 'Failed to upload file', detail }, 500)
  }
})

content.delete('/:id', requirePermission('content'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id')
    if (!UUID_RE.test(id)) return c.json({ error: 'Invalid content file id' }, 400)

    const file = await client.selectOne<ContentFile>('content_files_wagate', { filter: { id: `eq.${id}` } })
    if (!file) return c.json({ error: 'Content file not found' }, 404)

    try {
      const { getGoogleDriveClient } = await import('../../lib/google-drive')
      const driveClient = getGoogleDriveClient(c.env as Record<string, string | undefined>)
      await driveClient.deleteFile(file.google_drive_id)
    } catch {
      console.error(`Failed to delete file ${file.google_drive_id} from Google Drive`)
    }

    await client.delete<ContentFile>('content_files_wagate', { id: `eq.${id}` })
    return c.json({ message: 'Content file deleted' })
  } catch {
    return c.json({ error: 'Failed to delete content file' }, 500)
  }
})

export default content
