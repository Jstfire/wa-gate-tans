import { createFileRoute } from '@tanstack/solid-router'
import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { createSignal, Show } from 'solid-js'
import { createColumnHelper } from '@tanstack/solid-table'
import type { ColumnDef } from '@tanstack/solid-table'
import { DataTable } from '../../components/data-table'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/api-keys')({ component: ApiKeysPage })

type ApiKeyItem = {
  id: string
  name: string
  key: string
  lastUsedAt: string | null
  isActive: boolean
  createdAt: string
}

const col = createColumnHelper<ApiKeyItem>()

function maskKey(key: string): string {
  if (key.length <= 8) return key
  return '***' + key.slice(-8)
}

function ApiKeysPage() {
  const qc = useQueryClient()
  const [search, setSearch] = createSignal('')
  const [createOpen, setCreateOpen] = createSignal(false)
  const [revokeId, setRevokeId] = createSignal<string | null>(null)
  const [keyName, setKeyName] = createSignal('')
  const [generatedKey, setGeneratedKey] = createSignal<string | null>(null)

  const query = createQuery(() => ({
    queryKey: ['api-keys'],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      const res = await fetch('/api/api-keys', { headers: authHeader() })
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json() as Promise<ApiKeyItem[]>
    },
  }))

  const createMut = createMutation(() => ({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json() as Promise<{ key: string }>
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      setGeneratedKey(data.key)
      setKeyName('')
    },
  }))

  const revokeMut = createMutation(() => ({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error('Failed to revoke')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }); setRevokeId(null) },
  }))

  const closeCreate = () => { setCreateOpen(false); setKeyName(''); setGeneratedKey(null) }

  const columns = [
    col.accessor('name', { header: 'Nama' }),
    col.accessor('key', { header: 'Key', cell: (i) => <code class="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{maskKey(i.getValue())}</code> }),
    col.accessor('lastUsedAt', { header: 'Terakhir Digunakan', cell: (i) => { const v = i.getValue(); return v ? new Date(v).toLocaleDateString('id-ID') : 'Belum pernah' } }),
    col.accessor('isActive', { header: 'Status', cell: (i) => <Badge variant={i.getValue() ? 'success' : 'destructive'}>{i.getValue() ? 'Aktif' : 'Revoked'}</Badge> }),
    col.accessor('createdAt', { header: 'Dibuat', cell: (i) => new Date(i.getValue()).toLocaleDateString('id-ID') }),
    col.display({ id: 'actions', header: 'Aksi', cell: (i) => (
      <Show when={i.row.original.isActive}>
        <Button size="sm" variant="destructive" onClick={() => setRevokeId(i.row.original.id)}>Revoke</Button>
      </Show>
    )}),
  ]

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">API Keys</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Generate Key</Button>
      </div>
      <Card>
        <CardContent class="pt-6">
          <DataTable data={query.data ?? []} columns={columns as ColumnDef<ApiKeyItem, unknown>[]} loading={query.isLoading} globalFilter={search()} onGlobalFilterChange={setSearch} />
        </CardContent>
      </Card>

      <Dialog open={createOpen()} onClose={closeCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate API Key</DialogTitle></DialogHeader>
          <Show when={!generatedKey()} fallback={
            <div class="space-y-4">
              <p class="text-sm text-slate-600 dark:text-slate-400">Key berhasil dibuat. Salin sekarang, key tidak akan ditampilkan lagi.</p>
              <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                <code class="break-all text-sm text-slate-900 dark:text-slate-100">{generatedKey()}</code>
              </div>
              <DialogFooter>
                <Button onClick={closeCreate}>Tutup</Button>
              </DialogFooter>
            </div>
          }>
            <form onSubmit={(e) => { e.preventDefault(); if (keyName()) createMut.mutate(keyName()) }} class="space-y-4">
              <Input label="Nama Key *" required value={keyName()} onInput={(e) => setKeyName(e.currentTarget.value)} placeholder="Contoh: Production App" />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreate}>Batal</Button>
                <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? 'Generating...' : 'Generate'}</Button>
              </DialogFooter>
            </form>
          </Show>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeId()} onClose={() => setRevokeId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revoke API Key</DialogTitle></DialogHeader>
          <p class="text-sm text-slate-600 dark:text-slate-400">Key yang di-revoke tidak dapat digunakan lagi. Yakin?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeId(null)}>Batal</Button>
            <Button variant="destructive" disabled={revokeMut.isPending} onClick={() => { const id = revokeId(); if (id) revokeMut.mutate(id) }}>
              {revokeMut.isPending ? 'Revoking...' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
