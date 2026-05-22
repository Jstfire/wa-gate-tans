import { createFileRoute } from '@tanstack/solid-router'
import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { createSignal } from 'solid-js'
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

const col = createColumnHelper<ContentItem>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ContentPage() {
  const qc = useQueryClient()
  const [search, setSearch] = createSignal('')
  const [uploadOpen, setUploadOpen] = createSignal(false)
  const [deleteId, setDeleteId] = createSignal<string | null>(null)
  const [uploadName, setUploadName] = createSignal('')
  const [uploadCategory, setUploadCategory] = createSignal('')
  const [uploadFile, setUploadFile] = createSignal<File | null>(null)

  const query = createQuery(() => ({
    queryKey: ['content'],
    queryFn: async () => {
      const res = await fetch('/api/content', { headers: authHeader() })
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json() as Promise<ContentItem[]>
    },
  }))

  const uploadMutation = createMutation(() => ({
    mutationFn: async () => {
      const file = uploadFile()
      if (!file) throw new Error('No file selected')
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
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content'] })
      closeUpload()
    },
  }))

  const deleteMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/content/${id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['content'] }); setDeleteId(null) },
  }))

  const closeUpload = () => { setUploadOpen(false); setUploadName(''); setUploadCategory(''); setUploadFile(null) }

  const columns = [
    col.accessor('name', { header: 'Nama' }),
    col.accessor('originalFilename', { header: 'File Asli' }),
    col.accessor('mimeType', { header: 'Tipe' }),
    col.accessor('fileSize', { header: 'Ukuran', cell: (i) => formatSize(i.getValue()) }),
    col.accessor('category', { header: 'Kategori', cell: (i) => i.getValue() ?? '-' }),
    col.accessor('uploadedAt', { header: 'Diunggah', cell: (i) => new Date(i.getValue()).toLocaleDateString('id-ID') }),
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
          <DataTable data={query.data ?? []} columns={columns as ColumnDef<ContentItem, unknown>[]} loading={query.isLoading} globalFilter={search()} onGlobalFilterChange={setSearch} />
        </CardContent>
      </Card>

      <Dialog open={uploadOpen()} onClose={closeUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); uploadMutation.mutate() }} class="space-y-4">
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-300">File *</label>
              <input type="file" required onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) setUploadFile(f) }} class="text-sm text-slate-700 dark:text-slate-300" />
            </div>
            <Input label="Nama" value={uploadName()} onInput={(e) => setUploadName(e.currentTarget.value)} placeholder="Opsional, default nama file" />
            <Input label="Kategori" value={uploadCategory()} onInput={(e) => setUploadCategory(e.currentTarget.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeUpload}>Batal</Button>
              <Button type="submit" disabled={uploadMutation.isPending}>{uploadMutation.isPending ? 'Mengunggah...' : 'Upload'}</Button>
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
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => { const id = deleteId(); if (id) deleteMutation.mutate(id) }}>
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
