import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, onMount, Show } from 'solid-js'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

type DriveStatus = {
  ok?: boolean
  mode?: string
  folderId?: string
  folderName?: string
  error?: string
  message?: string
}

type LocalSettings = {
  rateLimitHour: string
  rateLimitDay: string
  blastMinDelay: string
  blastMaxDelay: string
}

const SETTINGS_STORAGE_KEY = 'wa-gate-settings'
const DEFAULT_SETTINGS: LocalSettings = {
  rateLimitHour: '50',
  rateLimitDay: '200',
  blastMinDelay: '60',
  blastMaxDelay: '90',
}

function readLocalSettings(): LocalSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) return DEFAULT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as Partial<LocalSettings>
    return {
      rateLimitHour: parsed.rateLimitHour ?? DEFAULT_SETTINGS.rateLimitHour,
      rateLimitDay: parsed.rateLimitDay ?? DEFAULT_SETTINGS.rateLimitDay,
      blastMinDelay: parsed.blastMinDelay ?? DEFAULT_SETTINGS.blastMinDelay,
      blastMaxDelay: parsed.blastMaxDelay ?? DEFAULT_SETTINGS.blastMaxDelay,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function SettingsPage() {
  const initial = readLocalSettings()
  const [rateLimitHour, setRateLimitHour] = createSignal(initial.rateLimitHour)
  const [rateLimitDay, setRateLimitDay] = createSignal(initial.rateLimitDay)
  const [blastMinDelay, setBlastMinDelay] = createSignal(initial.blastMinDelay)
  const [blastMaxDelay, setBlastMaxDelay] = createSignal(initial.blastMaxDelay)
  const [saved, setSaved] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal('')
  const [driveStatus, setDriveStatus] = createSignal<DriveStatus | null>(null)
  const [loadingDrive, setLoadingDrive] = createSignal(true)

  const tokenHeader = (): HeadersInit => {
    const token = typeof window === 'undefined' ? null : localStorage.getItem('wa-gate-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadDriveStatus = async () => {
    setLoadingDrive(true)
    try {
      const response = await fetch('/api/content/drive/status', { headers: tokenHeader() })
      const data = await response.json() as DriveStatus
      setDriveStatus(data)
    } catch (err) {
      setDriveStatus({ ok: false, error: err instanceof Error ? err.message : 'Gagal memuat status Drive' })
    } finally {
      setLoadingDrive(false)
    }
  }

  onMount(() => {
    void loadDriveStatus()
  })

  const handleSave = () => {
    setSaving(true)
    setError('')
    const minDelay = Number(blastMinDelay())
    const maxDelay = Number(blastMaxDelay())
    const perHour = Number(rateLimitHour())
    const perDay = Number(rateLimitDay())
    if (!Number.isFinite(perHour) || perHour < 1 || !Number.isFinite(perDay) || perDay < perHour) {
      setError('Rate limit tidak valid. Batas harian harus lebih besar atau sama dengan batas per jam.')
      setSaving(false)
      return
    }
    if (!Number.isFinite(minDelay) || !Number.isFinite(maxDelay) || minDelay < 60 || maxDelay < minDelay || maxDelay > 300) {
      setError('Delay blast harus valid: minimum minimal 60 detik, maksimum >= minimum, dan maksimum tidak lebih dari 300 detik.')
      setSaving(false)
      return
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      rateLimitHour: rateLimitHour(),
      rateLimitDay: rateLimitDay(),
      blastMinDelay: blastMinDelay(),
      blastMaxDelay: blastMaxDelay(),
    } satisfies LocalSettings))
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
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
              Default engine tetap 60–90 detik random per nomor. Nilai tersimpan di browser sebagai preferensi operator sampai endpoint konfigurasi server tersedia.
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
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-gray-700 dark:text-gray-300">Status koneksi</span>
              <Show when={!loadingDrive()} fallback={<Badge variant="warning">Memuat...</Badge>}>
                <Badge variant={driveStatus()?.ok ? 'success' : 'destructive'}>
                  {driveStatus()?.ok ? 'Terhubung' : 'Bermasalah'}
                </Badge>
              </Show>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Mode: {driveStatus()?.mode ?? '-'}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Folder: {driveStatus()?.folderName ?? '-'} ({driveStatus()?.folderId ?? '-'})
            </p>
            <Show when={!driveStatus()?.ok && driveStatus()?.error}>
              <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {driveStatus()?.error || driveStatus()?.message}
              </p>
            </Show>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadDriveStatus()} disabled={loadingDrive()}>
              Refresh Status Drive
            </Button>
          </CardContent>
        </Card>
      </div>

      <div class="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving()}>
          {saving() ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
        <Show when={saved()}>
          <span class="text-sm text-green-600 dark:text-green-400">Tersimpan di browser operator.</span>
        </Show>
        <Show when={error()}>
          <span class="text-sm text-red-600 dark:text-red-400">{error()}</span>
        </Show>
      </div>
    </div>
  )
}
