import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, Show, onMount } from 'solid-js'
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
type ApiKeyApiRow = { id: string; name: string; key: string; last_used_at: string | null; is_active: boolean; created_at: string }

const col = createColumnHelper<ApiKeyItem>()

function maskKey(key: string): string {
  if (key.length <= 8) return key
  return '***' + key.slice(-8)
}

function ApiKeysPage() {
  const [data, setData] = createSignal<ApiKeyItem[]>([])
  const [loading, setLoading] = createSignal(true)
  const [search, setSearch] = createSignal('')
  const [createOpen, setCreateOpen] = createSignal(false)
  const [revokeId, setRevokeId] = createSignal<string | null>(null)
  const [keyName, setKeyName] = createSignal('')
  const [generatedKey, setGeneratedKey] = createSignal<string | null>(null)
  const [creating, setCreating] = createSignal(false)
  const [revoking, setRevoking] = createSignal(false)

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/api-keys', { headers: authHeader() })
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      const rows: ApiKeyApiRow[] = Array.isArray(json) ? json : (json.data ?? [])
      setData(rows.map(r => ({ id: r.id, name: r.name, key: r.key, lastUsedAt: r.last_used_at, isActive: r.is_active, createdAt: r.created_at })))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  onMount(fetchKeys)

  const createKey = async (name: string) => {
    setCreating(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const json = await res.json()
      setGeneratedKey(json.key)
      setKeyName('')
      await fetchKeys()
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (id: string) => {
    setRevoking(true)
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE', headers: authHeader() })
      if (!res.ok) throw new Error('Failed to revoke')
      setRevokeId(null)
      await fetchKeys()
    } catch {
      // ignore
    } finally {
      setRevoking(false)
    }
  }

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
          <DataTable data={data()} columns={columns as ColumnDef<ApiKeyItem, unknown>[]} loading={loading()} globalFilter={search()} onGlobalFilterChange={setSearch} />
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
            <form onSubmit={(e) => { e.preventDefault(); if (keyName()) createKey(keyName()) }} class="space-y-4">
              <Input label="Nama Key *" required value={keyName()} onInput={(e) => setKeyName(e.currentTarget.value)} placeholder="Contoh: Production App" />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreate}>Batal</Button>
                <Button type="submit" disabled={creating()}>{creating() ? 'Generating...' : 'Generate'}</Button>
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
            <Button variant="destructive" disabled={revoking()} onClick={() => { const id = revokeId(); if (id) revokeKey(id) }}>
              {revoking() ? 'Revoking...' : 'Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
