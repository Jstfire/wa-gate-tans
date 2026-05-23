import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, Show, onMount, onCleanup } from 'solid-js'
import { DataTable  } from '../../components/data-table/index'
import type {ColumnDef} from '../../components/data-table/index';
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/blast')({
  component: BlastPage,
})

type BlastJob = {
  id: string
  name: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

type RawBlastJob = {
  id: string
  name: string
  status: string
  total_recipients?: number
  totalRecipients?: number
  sent_count?: number
  sentCount?: number
  failed_count?: number
  failedCount?: number
  created_at?: string
  createdAt?: string
  started_at?: string | null
  startedAt?: string | null
  completed_at?: string | null
  completedAt?: string | null
}

type BlastListResponse = { data?: RawBlastJob[] }

function mapBlastJob(row: RawBlastJob): BlastJob {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    totalRecipients: row.totalRecipients ?? row.total_recipients ?? 0,
    sentCount: row.sentCount ?? row.sent_count ?? 0,
    failedCount: row.failedCount ?? row.failed_count ?? 0,
    createdAt: row.createdAt ?? row.created_at ?? '',
    startedAt: row.startedAt ?? row.started_at ?? null,
    completedAt: row.completedAt ?? row.completed_at ?? null,
  }
}

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url, { headers: authHeader() }).then((r) => {
    if (!r.ok) throw new Error('Failed')
    return r.json() as Promise<T>
  })
}

function statusVariant(s: string): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  if (s === 'completed') return 'success'
  if (s === 'running') return 'secondary'
  if (s === 'paused') return 'warning'
  if (s === 'cancelled' || s === 'failed') return 'destructive'
  return 'default'
}

function estimateFinish(total: number, sent: number): string {
  const remaining = total - sent
  const seconds = remaining * 75
  if (seconds < 60) return `~${seconds}s`
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)}m`
  return `~${(seconds / 3600).toFixed(1)}h`
}

function BlastPage() {
  const [showCreate, setShowCreate] = createSignal(false)
  const [jobs, setJobs] = createSignal<BlastJob[]>([])
  const [loading, setLoading] = createSignal(true)

  const fetchJobs = async () => {
    try {
      const data = await fetchJson<BlastListResponse | RawBlastJob[]>('/api/blast')
      const rows = Array.isArray(data) ? data : data.data ?? []
      setJobs(rows.map(mapBlastJob))
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false)
    }
  }

  const doAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/blast/${id}/${action}`, {
        method: 'POST',
        headers: authHeader(),
      })
      if (!res.ok) throw new Error('Action failed')
      await res.json()
      fetchJobs()
    } catch {
      // action failed silently
    }
  }

  onMount(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 8000)
    onCleanup(() => clearInterval(interval))
  })

  const columns: ColumnDef<BlastJob>[] = [
    { accessorKey: 'name', header: 'Nama Job' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => <Badge variant={statusVariant(info.getValue() as string)}>{info.getValue() as string}</Badge>,
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: (info) => {
        const row = info.row.original
        const pct = row.totalRecipients > 0 ? Math.round((row.sentCount / row.totalRecipients) * 100) : 0
        return (
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs text-gray-500">
              <span>{row.sentCount}/{row.totalRecipients}</span>
              <span>{pct}%</span>
            </div>
            <div class="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div class="h-1.5 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    { accessorKey: 'failedCount', header: 'Gagal' },
    {
      id: 'eta',
      header: 'Estimasi Selesai',
      cell: (info) => {
        const row = info.row.original
        if (row.status === 'completed') return <span class="text-xs text-gray-400">Selesai</span>
        if (row.status !== 'running') return <span class="text-xs text-gray-400">-</span>
        return <span class="text-xs">{estimateFinish(row.totalRecipients, row.sentCount)}</span>
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: (info) => {
        const row = info.row.original
        return (
          <div class="flex gap-1">
            <Show when={row.status === 'draft' || row.status === 'queued'}>
              <Button size="sm" onClick={() => doAction(row.id, 'start')}>Start</Button>
            </Show>
            <Show when={row.status === 'running'}>
              <Button size="sm" variant="outline" onClick={() => doAction(row.id, 'pause')}>Pause</Button>
            </Show>
            <Show when={row.status === 'paused'}>
              <Button size="sm" onClick={() => doAction(row.id, 'resume')}>Resume</Button>
            </Show>
            <Show when={row.status === 'running' || row.status === 'paused' || row.status === 'queued'}>
              <Button size="sm" variant="destructive" onClick={() => doAction(row.id, 'cancel')}>Cancel</Button>
            </Show>
          </div>
        )
      },
    },
  ]

  return (
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">WA Blast</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Kirim pesan massal ke banyak nomor</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Buat Blast Baru</Button>
      </div>

      <DataTable
        data={jobs()}
        columns={columns}
        loading={loading()}
      />

      <Show when={showCreate()}>
        <CreateBlastDialog onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchJobs() }} />
      </Show>
    </div>
  )
}

type CreateBlastDialogProps = {
  onClose: () => void
  onSuccess: () => void
}

function CreateBlastDialog(props: CreateBlastDialogProps) {
  const [name, setName] = createSignal('')
  const [messageContent, setMessageContent] = createSignal('')
  const [recipients, setRecipients] = createSignal('')
  const [csvName, setCsvName] = createSignal('')
  const [error, setError] = createSignal('')
  const [loading, setLoading] = createSignal(false)

  const parsedRecipients = () => recipients()
    .split(/[\n,;]+/)
    .map((v) => v.trim())
    .filter(Boolean)

  const estimatedTime = () => {
    const count = parsedRecipients().length
    const minutes = Math.ceil((count * 75) / 60)
    return count === 0 ? '-' : `~${minutes} menit`
  }

  const handleCsv = async (file: File | undefined) => {
    if (!file) return
    setCsvName(file.name)
    const text = await file.text()
    setRecipients(text)
  }

  const handleSubmit = async () => {
    setError('')
    if (!name().trim() || !messageContent().trim() || parsedRecipients().length === 0) {
      setError('Nama, pesan, dan daftar nomor wajib diisi')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/blast', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name().trim(),
          messageContent: messageContent().trim(),
          recipients: parsedRecipients(),
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Gagal membuat blast job' })) as { error?: string; rejectedRecipients?: string[] }
        const rejected = payload.rejectedRecipients?.length ? ` (${payload.rejectedRecipients.length} nomor ditolak)` : ''
        throw new Error(`${payload.error ?? 'Gagal membuat blast job'}${rejected}`)
      }
      props.onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat blast job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Buat WA Blast Baru</h2>
          <button type="button" onClick={props.onClose} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
        </div>
        <div class="flex flex-col gap-4">
          <Show when={error()}>
            <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{error()}</div>
          </Show>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nama Job</label>
            <input value={name()} onInput={(e) => setName(e.currentTarget.value)} class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Isi Pesan</label>
            <textarea value={messageContent()} onInput={(e) => setMessageContent(e.currentTarget.value)} rows={5} class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Human-like typing simulation otomatis aktif saat pengiriman.</p>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Daftar Nomor</label>
            <textarea value={recipients()} onInput={(e) => setRecipients(e.currentTarget.value)} rows={6} placeholder="628xxxx\n628yyyy" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <div class="mt-2 flex items-center gap-3">
              <label class="cursor-pointer rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                Import CSV
                <input type="file" accept=".csv,.txt" class="hidden" onChange={(e) => handleCsv(e.currentTarget.files?.[0])} />
              </label>
              <span class="text-xs text-gray-500">{csvName()}</span>
            </div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div><span class="text-gray-500">Total nomor:</span> <strong>{parsedRecipients().length}</strong></div>
              <div><span class="text-gray-500">Estimasi selesai:</span> <strong>{estimatedTime()}</strong></div>
            </div>
            <p class="mt-2 text-xs text-gray-500">Pengiriman memakai jeda random 60–90 detik per nomor dan memfilter nomor invalid di backend.</p>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" onClick={props.onClose}>Batal</Button>
            <Button onClick={handleSubmit} disabled={loading()}>{loading() ? 'Menyimpan...' : 'Simpan Draft'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
