import { createFileRoute } from '@tanstack/solid-router'
import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { createSignal } from 'solid-js'
import { createColumnHelper } from '@tanstack/solid-table'
import type { ColumnDef } from '@tanstack/solid-table'
import { DataTable } from '../../components/data-table'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/chatbot')({ component: ChatbotPage })

type Rule = {
  id: string
  trigger: string
  parentTrigger: string | null
  responseType: string
  responseContent: string
  order: number
  isActive: boolean
}

type RuleForm = {
  trigger: string
  parentTrigger: string
  responseType: string
  responseContent: string
  order: number
  isActive: boolean
}

const col = createColumnHelper<Rule>()
const emptyForm = (): RuleForm => ({ trigger: '', parentTrigger: '', responseType: 'text', responseContent: '', order: 0, isActive: true })

function ChatbotPage() {
  const qc = useQueryClient()
  const [search, setSearch] = createSignal('')
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [deleteId, setDeleteId] = createSignal<string | null>(null)
  const [editing, setEditing] = createSignal<Rule | null>(null)
  const [form, setForm] = createSignal<RuleForm>(emptyForm())

  const query = createQuery(() => ({
    queryKey: ['chatbot-rules'],
    queryFn: async () => {
      const res = await fetch('/api/chatbot/rules', { headers: authHeader() })
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json() as Promise<Rule[]>
    },
  }))

  const saveMutation = createMutation(() => ({
    mutationFn: async (data: RuleForm) => {
      const body = {
        trigger: data.trigger,
        parentTrigger: data.parentTrigger || undefined,
        responseType: data.responseType,
        responseContent: data.responseContent,
        order: data.order,
        isActive: data.isActive,
      }
      const id = editing()?.id
      const res = await fetch(id ? `/api/chatbot/rules/${id}` : '/api/chatbot/rules', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chatbot-rules'] }); closeDialog() },
  }))

  const deleteMutation = createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chatbot/rules/${id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chatbot-rules'] }); setDeleteId(null) },
  }))

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true) }
  const openEdit = (r: Rule) => {
    setEditing(r)
    setForm({ trigger: r.trigger, parentTrigger: r.parentTrigger ?? '', responseType: r.responseType, responseContent: r.responseContent, order: r.order, isActive: r.isActive })
    setDialogOpen(true)
  }
  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyForm()) }

  const responseTypes = ['text', 'location', 'pdf', 'link', 'admin']

  const columns = [
    col.accessor('trigger', { header: 'Trigger' }),
    col.accessor('parentTrigger', { header: 'Parent', cell: (i) => i.getValue() ?? '-' }),
    col.accessor('responseType', { header: 'Tipe', cell: (i) => <Badge variant="outline">{i.getValue()}</Badge> }),
    col.accessor('order', { header: 'Urutan' }),
    col.accessor('isActive', { header: 'Status', cell: (i) => <Badge variant={i.getValue() ? 'success' : 'secondary'}>{i.getValue() ? 'Aktif' : 'Nonaktif'}</Badge> }),
    col.display({ id: 'actions', header: 'Aksi', cell: (i) => (
      <div class="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => openEdit(i.row.original)}>Edit</Button>
        <Button size="sm" variant="destructive" onClick={() => setDeleteId(i.row.original.id)}>Hapus</Button>
      </div>
    )}),
  ]

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Chatbot Rules</h1>
        <Button onClick={openCreate}>+ Tambah Rule</Button>
      </div>
      <Card>
        <CardContent class="pt-6">
          <DataTable data={query.data ?? []} columns={columns as ColumnDef<Rule, unknown>[]} loading={query.isLoading} globalFilter={search()} onGlobalFilterChange={setSearch} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen()} onClose={closeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing() ? 'Edit Rule' : 'Tambah Rule'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form()) }} class="space-y-4">
            <Input label="Trigger *" required value={form().trigger} onInput={(e) => setForm({ ...form(), trigger: e.currentTarget.value })} />
            <Input label="Parent Trigger" value={form().parentTrigger} onInput={(e) => setForm({ ...form(), parentTrigger: e.currentTarget.value })} />
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Tipe Response *</label>
              <select value={form().responseType} onChange={(e) => setForm({ ...form(), responseType: e.currentTarget.value })} class="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                {responseTypes.map((t) => <option value={t}>{t}</option>)}
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-300">Konten Response *</label>
              <textarea required rows={3} value={form().responseContent} onInput={(e) => setForm({ ...form(), responseContent: e.currentTarget.value })} class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <Input label="Urutan" type="number" value={String(form().order)} onInput={(e) => setForm({ ...form(), order: Number(e.currentTarget.value) || 0 })} />
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form().isActive} onChange={(e) => setForm({ ...form(), isActive: e.currentTarget.checked })} />
              <span class="text-slate-700 dark:text-slate-300">Aktif</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId()} onClose={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Rule</DialogTitle></DialogHeader>
          <p class="text-sm text-slate-600 dark:text-slate-400">Yakin ingin menghapus rule ini?</p>
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
