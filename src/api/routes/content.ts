import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../db'
import { content_files_wagate } from '../../db/schema'
import { authMiddleware  } from '../middleware/auth'
import type {ApiContext} from '../middleware/auth';
import { requirePermission } from '../middleware/permission'
import { getGoogleDriveClient } from '../../lib/google-drive'

const content = new Hono()

content.use('*', authMiddleware)

// GET /content — list content files
content.get('/', requirePermission('content'), async (c) => {
  try {
    const rows = await db.select().from(content_files_wagate)
      .orderBy(desc(content_files_wagate.createdAt))

    return c.json({ data: rows })
  } catch {
    return c.json({ error: 'Failed to fetch content files' }, 500)
  }
})

// POST /content/upload — upload file to Google Drive + save metadata
content.post('/upload', requirePermission('content'), async (c: ApiContext) => {
  try {
    const user = c.get('user')
    const formData = await c.req.formData()
    const file = formData.get('file')
    const category = formData.get('category')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'File is required' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const driveClient = getGoogleDriveClient()

    const uploadResult = await driveClient.uploadFile(
      file.name,
      file.type || 'application/octet-stream',
      buffer
    )

    const [row] = await db.insert(content_files_wagate).values({
      name: file.name.replace(/\.[^.]+$/, ''),
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: buffer.length,
      googleDriveId: uploadResult.id,
      googleDriveUrl: uploadResult.url,
      category: typeof category === 'string' ? category : undefined,
      uploadedBy: user.id,
    }).returning()

    return c.json(row, 201)
  } catch (error) {
    console.error('Content upload error:', error)
    return c.json({ error: 'Failed to upload file' }, 500)
  }
})

// DELETE /content/:id — delete from Google Drive + DB
content.delete('/:id', requirePermission('content'), async (c) => {
  try {
    const id = c.req.param('id') as string

    const [file] = await db.select().from(content_files_wagate)
      .where(eq(content_files_wagate.id, id))
      .limit(1)

    if (!file) return c.json({ error: 'Content file not found' }, 404)

    // Delete from Google Drive
    const driveClient = getGoogleDriveClient()
    try {
      await driveClient.deleteFile(file.googleDriveId)
    } catch {
      console.error(`Failed to delete file ${file.googleDriveId} from Google Drive`)
    }

    // Delete from DB
    await db.delete(content_files_wagate).where(eq(content_files_wagate.id, id))

    return c.json({ message: 'Content file deleted' })
  } catch {
    return c.json({ error: 'Failed to delete content file' }, 500)
  }
})

export default content
