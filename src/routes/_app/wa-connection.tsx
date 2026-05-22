import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, For, Show, onCleanup, onMount } from 'solid-js'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/wa-connection')({
  component: WaConnectionPage,
})

type RuntimeKind = 'primary' | 'backup'
type RuntimeStatus = {
  label: string
  kind: RuntimeKind
  url: string
  status: string
  reachable: boolean
  hasQr?: boolean
  lastError?: string | null
  error?: string
  lastEventAt?: string | null
  readyAt?: string | null
  reconnectAttempts?: number
  account?: { wid: string; pushname?: string } | null
}

type RuntimeQr = {
  label: string
  kind: RuntimeKind
  url: string
  status: string
  reachable: boolean
  qr: string | null
  raw: string | null
  error?: string
}

function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  return fetch(url, { ...init, headers: { ...authHeader(), ...(init.headers ?? {}) } }).then(async (res) => {
    const text = await res.text()
    const data = text ? JSON.parse(text) as T : {} as T
    if (!res.ok) throw new Error('error' in (data as Record<string, unknown>) ? String((data as { error?: unknown }).error) : 'Request failed')
    return data
  })
}

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'connected' || status === 'authenticated') return 'success'
  if (status === 'qr_pending' || status === 'initializing' || status === 'connecting') return 'warning'
  if (status === 'error' || status === 'disconnected') return 'destructive'
  return 'secondary'
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function RuntimeCard(props: { runtime: RuntimeStatus; qr?: RuntimeQr; onRefreshQr: (kind: RuntimeKind) => void; refreshing: boolean }) {
  const canShowQr = () => props.qr?.qr && props.runtime.status !== 'connected' && props.runtime.status !== 'authenticated'
  return (
    <Card class="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <CardHeader>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-semibold text-slate-950 dark:text-white">{props.runtime.label}</h2>
              <Badge variant={props.runtime.kind === 'primary' ? 'success' : 'secondary'}>{props.runtime.kind}</Badge>
            </div>
            <p class="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{props.runtime.url}</p>
          </div>
          <Badge variant={statusVariant(props.runtime.status)}>{props.runtime.status}</Badge>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <Info label="Reachable" value={props.runtime.reachable ? 'Ya' : 'Tidak'} />
          <Info label="Has QR" value={props.runtime.hasQr ? 'Ya' : 'Tidak'} />
          <Info label="Ready At" value={formatDate(props.runtime.readyAt)} />
          <Info label="Last Event" value={formatDate(props.runtime.lastEventAt)} />
          <Info label="Reconnect" value={String(props.runtime.reconnectAttempts ?? 0)} />
          <Info label="Akun" value={props.runtime.account?.pushname ?? props.runtime.account?.wid ?? '-'} />
        </div>

        <Show when={props.runtime.account?.wid}>
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
            Terhubung sebagai <span class="font-semibold">{props.runtime.account?.wid}</span>
          </div>
        </Show>

        <Show when={props.runtime.lastError || props.runtime.error}>
          <div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {props.runtime.lastError ?? props.runtime.error}
          </div>
        </Show>

        <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/70">
          <div class="mb-3 flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200">QR Code</p>
            <Button variant="outline" size="sm" class="border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={() => props.onRefreshQr(props.runtime.kind)} disabled={props.refreshing}>
              {props.refreshing ? 'Loading...' : `Refresh QR ${props.runtime.kind}`}
            </Button>
          </div>
          <Show when={canShowQr()} fallback={<div class="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">QR tidak diperlukan saat runtime sudah connected/authenticated atau QR belum tersedia.</div>}>
            <img src={props.qr?.qr ?? ''} alt={`QR ${props.runtime.label}`} class="mx-auto h-64 w-64 rounded-2xl bg-white p-3" />
          </Show>
        </div>
      </CardContent>
    </Card>
  )
}

function Info(props: { label: string; value: string }) {
  return (
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/70">
      <p class="text-xs text-slate-500 dark:text-slate-400">{props.label}</p>
      <p class="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white" title={props.value}>{props.value}</p>
    </div>
  )
}

function WaConnectionPage() {
  const [statusList, setStatusList] = createSignal<RuntimeStatus[]>([])
  const [qrList, setQrList] = createSignal<RuntimeQr[]>([])
  const [loading, setLoading] = createSignal(true)
  const [refreshingQr, setRefreshingQr] = createSignal<RuntimeKind | 'all' | null>(null)
  const [error, setError] = createSignal('')

  const refreshStatus = async () => {
    try {
      setError('')
      const result = await fetchJson<{ data: RuntimeStatus[] }>('/api/wa/status/all')
      setStatusList(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil status WA')
    } finally {
      setLoading(false)
    }
  }

  const refreshQr = async (kind?: RuntimeKind) => {
    setRefreshingQr(kind ?? 'all')
    try {
      if (kind) {
        const result = await fetchJson<RuntimeQr>(`/api/wa/qr/refresh/${kind}`, { method: 'POST' })
        setQrList((current) => [...current.filter((item) => item.kind !== kind), result])
      } else {
        const results = await Promise.allSettled([
          fetchJson<RuntimeQr>('/api/wa/qr/refresh/primary', { method: 'POST' }),
          fetchJson<RuntimeQr>('/api/wa/qr/refresh/backup', { method: 'POST' }),
        ])
        const fulfilled = results
          .filter((item): item is PromiseFulfilledResult<RuntimeQr> => item.status === 'fulfilled')
          .map((item) => item.value)
        if (fulfilled.length > 0) {
          setQrList((current) => [
            ...current.filter((item) => !fulfilled.some((fresh) => fresh.kind === item.kind)),
            ...fulfilled,
          ])
        }
        const rejected = results.find((item): item is PromiseRejectedResult => item.status === 'rejected')
        if (rejected && fulfilled.length === 0) throw rejected.reason
      }
      await refreshStatus()
    } finally {
      setRefreshingQr(null)
    }
  }

  const fetchCurrentQr = async () => {
    try {
      const results = await Promise.allSettled([
        fetchJson<RuntimeQr>('/api/wa/qr/by/primary'),
        fetchJson<RuntimeQr>('/api/wa/qr/by/backup'),
      ])
      const fulfilled = results
        .filter((item): item is PromiseFulfilledResult<RuntimeQr> => item.status === 'fulfilled')
        .map((item) => item.value)
      if (fulfilled.length > 0) setQrList(fulfilled)
    } catch { /* silent */ }
  }

  const qrFor = (kind: RuntimeKind) => qrList().find((item) => item.kind === kind)

  onMount(() => {
    void refreshStatus()
    void fetchCurrentQr()
    const id = window.setInterval(() => void refreshStatus(), 5000)
    onCleanup(() => window.clearInterval(id))
  })

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-sm font-medium uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-300">WA Runtime Monitor</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">WA Connection</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Pantau koneksi Primary Windows dan Backup Koyeb lengkap dengan QR, akun, status event, dan error terakhir.</p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" onClick={refreshStatus} disabled={loading()}>{loading() ? 'Loading...' : 'Refresh Status'}</Button>
          <Button onClick={() => refreshQr()} disabled={refreshingQr() !== null}>{refreshingQr() === 'all' ? 'Loading QR...' : 'Refresh 2 QR'}</Button>
        </div>
      </div>

      <Show when={error()}>
        <div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">{error()}</div>
      </Show>

      <div class="grid gap-5 xl:grid-cols-2">
        <For each={statusList()} fallback={<div class="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-white/10 dark:text-slate-400">Memuat status runtime...</div>}>
          {(runtime) => <RuntimeCard runtime={runtime} qr={qrFor(runtime.kind)} refreshing={refreshingQr() === runtime.kind} onRefreshQr={refreshQr} />}
        </For>
      </div>
    </div>
  )
}
