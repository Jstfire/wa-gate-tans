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

function WaConnectionPage() {
  const [connecting, setConnecting] = createSignal(false)
  const [statusData, setStatusData] = createSignal<Record<string, unknown> | null>(null)
  const [qrData, setQrData] = createSignal<Record<string, unknown> | null>(null)

  const refreshStatus = async () => {
    try {
      const data = await fetchWithAuth('/api/wa/status')
      setStatusData(data)
      if (data.status === 'connecting' || data.status === 'qr_pending' || data.hasQr === true) {
        const qr = await fetchWithAuth('/api/wa/qr')
        setQrData(qr)
      } else {
        setQrData(null)
      }
    } catch {
      setStatusData({ status: 'unknown' })
    }
  }

  onMount(() => {
    refreshStatus()
    const interval = window.setInterval(refreshStatus, 5000)
    return () => window.clearInterval(interval)
  })

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await fetch('/api/wa/connect', { method: 'POST', headers: authHeader() })
      await refreshStatus()
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    await fetch('/api/wa/disconnect', { method: 'POST', headers: authHeader() })
    await refreshStatus()
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
            <Badge variant={status() === 'connected' ? 'success' : status() === 'connecting' || status() === 'qr_pending' || status() === 'initializing' ? 'warning' : 'destructive'}>
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
            </div>
          </Show>

          <div class="flex gap-3">
            <Show when={status() !== 'connected'}>
              <Button onClick={handleConnect} disabled={connecting() || status() === 'connecting' || status() === 'initializing'}>
                {connecting() ? 'Connecting...' : 'Connect'}
              </Button>
            </Show>
            <Show when={status() === 'connected'}>
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
