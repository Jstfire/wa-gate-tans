import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, Show } from 'solid-js'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const [rateLimitHour, setRateLimitHour] = createSignal('50')
  const [rateLimitDay, setRateLimitDay] = createSignal('200')
  const [blastMinDelay, setBlastMinDelay] = createSignal('60')
  const [blastMaxDelay, setBlastMaxDelay] = createSignal('90')
  const [saved, setSaved] = createSignal(false)
  const [saving, setSaving] = createSignal(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 500))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Konfigurasi sistem WA Gate</p>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <p class="font-semibold text-gray-900 dark:text-white">Rate Limiting</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Batas pengiriman pesan untuk mencegah ban</p>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Maks pesan per jam
              </label>
              <input
                type="number"
                value={rateLimitHour()}
                onInput={(e) => setRateLimitHour(e.currentTarget.value)}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Maks pesan per hari
              </label>
              <input
                type="number"
                value={rateLimitDay()}
                onInput={(e) => setRateLimitDay(e.currentTarget.value)}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p class="font-semibold text-gray-900 dark:text-white">WA Blast Delay</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Jeda antar pengiriman (anti-ban)</p>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Delay minimum (detik)
              </label>
              <input
                type="number"
                value={blastMinDelay()}
                onInput={(e) => setBlastMinDelay(e.currentTarget.value)}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Delay maksimum (detik)
              </label>
              <input
                type="number"
                value={blastMaxDelay()}
                onInput={(e) => setBlastMaxDelay(e.currentTarget.value)}
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Default: 60–90 detik random per nomor. Nilai ini dikodekan di blast engine.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p class="font-semibold text-gray-900 dark:text-white">Anti-Ban Mechanisms</p>
          </CardHeader>
          <CardContent class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700 dark:text-gray-300">Human-like typing simulation</span>
              <Badge variant="success">Aktif</Badge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700 dark:text-gray-300">Random delay 60–90s per blast</span>
              <Badge variant="success">Aktif</Badge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700 dark:text-gray-300">Filter nomor tanpa history chat</span>
              <Badge variant="success">Aktif</Badge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700 dark:text-gray-300">Auto-reconnect dengan backoff</span>
              <Badge variant="success">Aktif</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p class="font-semibold text-gray-900 dark:text-white">Google Drive</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">Konfigurasi penyimpanan file</p>
          </CardHeader>
          <CardContent class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700 dark:text-gray-300">Status koneksi</span>
              <Badge variant="warning">Perlu refresh token</Badge>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Folder ID: 1gSzRegyHcg0zFstXRGEjv8JEBESzUK7D
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving()}>
          {saving() ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
        <Show when={saved()}>
          <span class="text-sm text-green-600 dark:text-green-400">Tersimpan!</span>
        </Show>
      </div>
    </div>
  )
}
