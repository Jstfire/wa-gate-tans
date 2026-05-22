import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, onMount } from 'solid-js'
import { createColumnHelper } from '@tanstack/solid-table'
import type { ColumnDef } from '@tanstack/solid-table'
import { DataTable } from '../../components/data-table'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/content')({ component: ContentPage })

type ContentItem = {
  id: string
  name: string
  originalFilename: string
  mimeType: string
  fileSize: number
  category: string | null
  driveUrl: string | null
  uploadedAt: string
}

type ContentApiRow = {
  id: string
  name: string
  original_filename: string
  mime_type: string
  file_size: number
  category: string | null
  google_drive_url: string | null
  created_at: string
}

const col = createColumnHelper<ContentItem>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('id-ID')
}

function ContentPage() {
  const [search, setSearch] = createSignal('')
  const [uploadOpen, setUploadOpen] = createSignal(false)
  const [deleteId, setDeleteId] = createSignal<string | null>(null)
  const [uploadName, setUploadName] = createSignal('')
  const [uploadCategory, setUploadCategory] = createSignal('')
  const [uploadFile, setUploadFile] = createSignal<File | null>(null)

  const [items, setItems] = createSignal<ContentItem[]>([])
  const [loading, setLoading] = createSignal(true)
  const [uploading, setUploading] = createSignal(false)
  const [deleting, setDeleting] = createSignal(false)

  const mapRow = (r: ContentApiRow): ContentItem => ({
    id: r.id,
    name: r.name,
    originalFilename: r.original_filename,
    mimeType: r.mime_type,
    fileSize: r.file_size,
    category: r.category,
    driveUrl: r.google_drive_url,
    uploadedAt: r.created_at,
  })

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/content', { headers: authHeader() })
      if (!res.ok) throw new Error('Failed to fetch')
      const body = (await res.json()) as { data?: ContentApiRow[] } | ContentApiRow[]
      const rows = Array.isArray(body) ? body : (body.data ?? [])
      setItems(rows.map(mapRow))
    } catch {
      // silently fail — UI will show empty
    } finally {
      setLoading(false)
    }
  }

  onMount(() => { fetchItems() })

  const closeUpload = () => { setUploadOpen(false); setUploadName(''); setUploadCategory(''); setUploadFile(null) }

  const handleUpload = async () => {
    const file = uploadFile()
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', uploadName() || file.name)
      if (uploadCategory()) fd.append('category', uploadCategory())
      const res = await fetch('/api/content/upload', {
        method: 'POST',
        headers: authHeader(),
        body: fd,
      })
      if (!res.ok) throw new Error('Upload failed')
      closeUpload()
      await fetchItems()
    } catch {
      // keep dialog open on error
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    const id = deleteId()
    if (!id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/content/${id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error('Failed to delete')
      setDeleteId(null)
      await fetchItems()
    } catch {
      // keep dialog open on error
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    col.accessor('name', { header: 'Nama' }),
    col.accessor('originalFilename', { header: 'File Asli' }),
    col.accessor('mimeType', { header: 'Tipe' }),
    col.accessor('fileSize', { header: 'Ukuran', cell: (i) => formatSize(i.getValue()) }),
    col.accessor('category', { header: 'Kategori', cell: (i) => i.getValue() ?? '-' }),
    col.accessor('uploadedAt', { header: 'Diunggah', cell: (i) => formatDate(i.getValue()) }),
    col.display({ id: 'actions', header: 'Aksi', cell: (i) => (
      <div class="flex gap-2">
        {i.row.original.driveUrl && (
          <a href={i.row.original.driveUrl} target="_blank" rel="noopener noreferrer" class="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            Lihat
          </a>
        )}
        <Button size="sm" variant="destructive" onClick={() => setDeleteId(i.row.original.id)}>Hapus</Button>
      </div>
    )}),
  ]

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Content / Files</h1>
        <Button onClick={() => setUploadOpen(true)}>+ Upload File</Button>
      </div>
      <Card>
        <CardContent class="pt-6">
          <DataTable data={items()} columns={columns as ColumnDef<ContentItem, unknown>[]} loading={loading()} globalFilter={search()} onGlobalFilterChange={setSearch} />
        </CardContent>
      </Card>

      <Dialog open={uploadOpen()} onClose={closeUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleUpload() }} class="space-y-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-300">File *</label>
              <input type="file" required onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) setUploadFile(f) }} class="text-sm text-slate-700 dark:text-slate-300" />
            </div>
            <Input label="Nama" value={uploadName()} onInput={(e) => setUploadName(e.currentTarget.value)} placeholder="Opsional, default nama file" />
            <Input label="Kategori" value={uploadCategory()} onInput={(e) => setUploadCategory(e.currentTarget.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeUpload}>Batal</Button>
              <Button type="submit" disabled={uploading()}>{uploading() ? 'Mengunggah...' : 'Upload'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId()} onClose={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus File</DialogTitle></DialogHeader>
          <p class="text-sm text-slate-600 dark:text-slate-400">File akan dihapus dari Google Drive dan database. Yakin?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleting()} onClick={handleDelete}>
              {deleting() ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
