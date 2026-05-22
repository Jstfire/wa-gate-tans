import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, onMount } from 'solid-js'
import { createColumnHelper } from '@tanstack/solid-table'
import type { ColumnDef } from '@tanstack/solid-table'
import { DataTable } from '../../components/data-table'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/templates')({ component: TemplatesPage })

type Template = {
  id: string
  name: string
  content: string
  variables: string[] | null
  category: string | null
  isActive: boolean
  createdAt: string
}

type TemplateForm = {
  name: string
  content: string
  category: string
  variables: string
  isActive: boolean
}

const col = createColumnHelper<Template>()
const emptyForm = (): TemplateForm => ({ name: '', content: '', category: '', variables: '', isActive: true })

function TemplatesPage() {
  const [search, setSearch] = createSignal('')
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [deleteId, setDeleteId] = createSignal<string | null>(null)
  const [editing, setEditing] = createSignal<Template | null>(null)
  const [form, setForm] = createSignal<TemplateForm>(emptyForm())

  const [templates, setTemplates] = createSignal<Template[]>([])
  const [loading, setLoading] = createSignal(true)
  const [saving, setSaving] = createSignal(false)
  const [deleting, setDeleting] = createSignal(false)

  const refreshTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/templates', { headers: authHeader() })
      if (!res.ok) throw new Error('Failed to fetch')
      setTemplates((await res.json()) as Template[])
    } finally {
      setLoading(false)
    }
  }

  onMount(() => { void refreshTemplates() })

  const saveTemplate = async (data: TemplateForm) => {
    setSaving(true)
    try {
      const body = {
        name: data.name,
        content: data.content,
        category: data.category || undefined,
        variables: data.variables ? data.variables.split(',').map((v) => v.trim()).filter(Boolean) : [],
        isActive: data.isActive,
      }
      const id = editing()?.id
      const res = await fetch(id ? `/api/templates/${id}` : '/api/templates', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      closeDialog()
      await refreshTemplates()
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error('Failed to delete')
      setDeleteId(null)
      await refreshTemplates()
    } finally {
      setDeleting(false)
    }
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true) }
  const openEdit = (t: Template) => {
    setEditing(t)
    setForm({ name: t.name, content: t.content, category: t.category ?? '', variables: (t.variables ?? []).join(', '), isActive: t.isActive })
    setDialogOpen(true)
  }
  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyForm()) }

  const columns = [
    col.accessor('name', { header: 'Nama' }),
    col.accessor('category', { header: 'Kategori', cell: (i) => i.getValue() ?? '-' }),
    col.accessor('variables', { header: 'Variabel', cell: (i) => String(i.getValue()?.length ?? 0) }),
    col.accessor('isActive', { header: 'Status', cell: (i) => <Badge variant={i.getValue() ? 'success' : 'secondary'}>{i.getValue() ? 'Aktif' : 'Nonaktif'}</Badge> }),
    col.accessor('createdAt', { header: 'Dibuat', cell: (i) => new Date(i.getValue()).toLocaleDateString('id-ID') }),
    col.display({ id: 'actions', header: 'Aksi', cell: (i) => (
      <div class="flex gap-2">
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(i.row.original) }}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
        </Button>
        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(i.row.original.id) }}>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        </Button>
      </div>
    )}),
  ]

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Templates</h1>
        <Button onClick={openCreate}>+ Tambah Template</Button>
      </div>
      <Card>
        <CardContent class="pt-6">
          <DataTable data={templates()} columns={columns as ColumnDef<Template, unknown>[]} loading={loading()} globalFilter={search()} onGlobalFilterChange={setSearch} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen()} onClose={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing() ? 'Edit Template' : 'Tambah Template'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void saveTemplate(form()) }} class="space-y-4">
            <Input label="Nama *" value={form().name} onInput={(e) => setForm({ ...form(), name: e.currentTarget.value })} required />
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Konten *</label>
              <textarea required rows={4} value={form().content} onInput={(e) => setForm({ ...form(), content: e.currentTarget.value })} class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <Input label="Kategori" value={form().category} onInput={(e) => setForm({ ...form(), category: e.currentTarget.value })} />
            <Input label="Variabel (pisahkan koma)" value={form().variables} onInput={(e) => setForm({ ...form(), variables: e.currentTarget.value })} placeholder="nama, tanggal, nomor" />
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form().isActive} onChange={(e) => setForm({ ...form(), isActive: e.currentTarget.checked })} />
              <span class="text-slate-700 dark:text-slate-300">Aktif</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Batal</Button>
              <Button type="submit" disabled={saving()}>{saving() ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId()} onClose={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Template</DialogTitle></DialogHeader>
          <p class="text-sm text-slate-600 dark:text-slate-400">Yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleting()} onClick={() => { const id = deleteId(); if (id) void deleteTemplate(id) }}>
              {deleting() ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
