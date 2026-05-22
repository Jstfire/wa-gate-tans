import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, Show, onMount } from 'solid-js'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/wa-connection')({
  component: WaConnectionPage,
})

function fetchWithAuth(url: string) {
  return fetch(url, { headers: authHeader() }).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<Record<string, unknown>>
  })
}

function shouldFetchQr(data: Record<string, unknown>): boolean {
  return data.status !== 'connected' && data.hasQr === true
}

function WaConnectionPage() {
  const [connecting, setConnecting] = createSignal(false)
  const [refreshingQr, setRefreshingQr] = createSignal(false)
  const [statusData, setStatusData] = createSignal<Record<string, unknown> | null>(null)
  const [qrData, setQrData] = createSignal<Record<string, unknown> | null>(null)

  const refreshStatus = async (options: { includeQr?: boolean } = {}) => {
    try {
      const data = await fetchWithAuth('/api/wa/status')
      setStatusData(data)

      if (data.status === 'connected' || data.status === 'authenticated') {
        setQrData(null)
        return
      }

      if (options.includeQr && shouldFetchQr(data)) {
        const qr = await fetchWithAuth('/api/wa/qr')
        setQrData(qr)
      }
    } catch {
      setStatusData({ status: 'unknown' })
    }
  }

  const refreshQr = async () => {
    setRefreshingQr(true)
    try {
      await refreshStatus({ includeQr: true })
    } finally {
      setRefreshingQr(false)
    }
  }

  onMount(() => {
    void refreshStatus({ includeQr: true })
    const interval = window.setInterval(() => {
      const current = status()
      if (current === 'qr_pending' || current === 'authenticated' || current === 'initializing') {
        void refreshStatus({ includeQr: false })
      }
    }, 5000)
    return () => window.clearInterval(interval)
  })

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await fetch('/api/wa/connect', { method: 'POST', headers: authHeader() })
      await refreshStatus({ includeQr: true })
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await fetch('/api/wa/disconnect', { method: 'POST', headers: authHeader() })
    await refreshStatus({ includeQr: true })
  }

  const status = () => (statusData()?.status as string) ?? 'unknown'

  return (
    <div class="flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">WA Connection</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your WhatsApp connection</p>
      </div>

      <Card class="max-w-lg">
        <CardHeader>
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Connection Status</p>
            <Badge variant={status() === 'connected' || status() === 'authenticated' ? 'success' : status() === 'connecting' || status() === 'qr_pending' || status() === 'initializing' ? 'warning' : 'destructive'}>
              {status()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Show when={(statusData()?.account as { wid?: string; pushname?: string } | null)?.wid}>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Connected as: <span class="font-medium text-gray-900 dark:text-white">{(statusData()?.account as { wid?: string; pushname?: string } | null)?.wid}</span>
            </p>
          </Show>

          <Show when={qrData()?.qr}>
            <div class="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <p class="text-sm text-gray-600 dark:text-gray-400">Scan QR code with WhatsApp</p>
              <img src={qrData()?.qr as string} alt="QR Code" class="h-64 w-64" />
              <p class="text-center text-xs text-gray-500 dark:text-gray-400">QR hanya diambil saat halaman ini dibuka atau tombol refresh ditekan.</p>
            </div>
          </Show>

          <div class="flex flex-wrap gap-3">
            <Show when={status() !== 'connected' && status() !== 'authenticated'}>
              <Button onClick={handleConnect} disabled={connecting() || status() === 'connecting' || status() === 'initializing'}>
                {connecting() ? 'Connecting...' : 'Connect'}
              </Button>
              <Button variant="outline" onClick={refreshQr} disabled={refreshingQr() || status() === 'connected'}>
                {refreshingQr() ? 'Refreshing...' : 'Refresh QR'}
              </Button>
            </Show>
            <Show when={status() === 'connected' || status() === 'authenticated'}>
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </Show>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
