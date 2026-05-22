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

content.post('/upload', requirePermission('content'), async (c: ApiContext) => {
  try {
    const client = getWagateClient()
    const user = c.get('user')
    const formData = await c.req.formData()
    const file = formData.get('file')
    const category = formData.get('category')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'File is required' }, 400)
    }

    let driveClient: { uploadFile: (name: string, mime: string, buffer: Buffer) => Promise<{ id: string; url: string }> }
    try {
      const { getGoogleDriveClient } = await import('../../lib/google-drive')
      driveClient = getGoogleDriveClient()
    } catch {
      return c.json({ error: 'Google Drive not configured' }, 503)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await driveClient.uploadFile(
      file.name,
      file.type || 'application/octet-stream',
      buffer
    )

    const [row] = await client.insert<ContentFile>('content_files_wagate', {
      name: file.name.replace(/\.[^.]+$/, ''),
      original_filename: file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: buffer.length,
      google_drive_id: uploadResult.id,
      google_drive_url: uploadResult.url,
      category: typeof category === 'string' ? category : null,
      uploaded_by: user.id,
    })

    return c.json(row, 201)
  } catch (error) {
    console.error('Content upload error:', error)
    return c.json({ error: 'Failed to upload file' }, 500)
  }
})

content.delete('/:id', requirePermission('content'), async (c) => {
  try {
    const client = getWagateClient()
    const id = c.req.param('id')

    const file = await client.selectOne<ContentFile>('content_files_wagate', { filter: { id: `eq.${id}` } })
    if (!file) return c.json({ error: 'Content file not found' }, 404)

    try {
      const { getGoogleDriveClient } = await import('../../lib/google-drive')
      const driveClient = getGoogleDriveClient()
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
