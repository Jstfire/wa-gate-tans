import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, For, onMount } from 'solid-js'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { authHeader } from '../../contexts/auth'

type DashboardStats = {
  messagesToday: number
  templates: number
  waStatus: string
  activeBlast: number
}

type QuickItem = { label: string; value: string; href: string }

export const Route = createFileRoute('/_app/dashboard')({ component: DashboardPage })

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: authHeader() })
  if (!res.ok) return {}
  return (await res.json()) as Record<string, unknown>
}

function countFromPayload(data: Record<string, unknown>): number {
  if (typeof data.count === 'number') return data.count
  if (typeof data.total === 'number') return data.total
  if (Array.isArray(data)) return data.length
  if (Array.isArray(data.data)) return data.data.length
  if (Array.isArray(data.items)) return data.items.length
  return 0
}

function DashboardPage() {
  const [loading, setLoading] = createSignal(true)
  const [stats, setStats] = createSignal<DashboardStats>({ messagesToday: 0, templates: 0, waStatus: 'unknown', activeBlast: 0 })

  onMount(async () => {
    try {
      const [messages, templates, wa, blast] = await Promise.all([
        fetchJson('/api/messages?today=true'),
        fetchJson('/api/templates'),
        fetchJson('/api/wa/status'),
        fetchJson('/api/blast?status=active'),
      ])
      setStats({
        messagesToday: countFromPayload(messages),
        templates: countFromPayload(templates),
        waStatus: typeof wa.status === 'string' ? wa.status : 'unknown',
        activeBlast: countFromPayload(blast),
      })
    } finally {
      setLoading(false)
    }
  })

  const quick: QuickItem[] = [
    { label: 'Buka Inbox Live', value: 'WhatsApp-style tab', href: '/inbox-live' },
    { label: 'WA Connection', value: 'QR & runtime status', href: '/wa-connection' },
    { label: 'WA Blast', value: 'Queue & recipients', href: '/blast' },
    { label: 'Chatbot Rules', value: 'Flow & fallback', href: '/chatbot' },
  ]

  return (
    <div class="flex flex-col gap-5">
      <section class="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_32px_100px_-55px_rgba(2,6,23,0.95)] dark:border-white/10">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.35),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.22),transparent_30%)]" />
        <div class="relative grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
          <div>
            <Badge variant={stats().waStatus === 'connected' || stats().waStatus === 'authenticated' ? 'success' : 'warning'}>
              Runtime {loading() ? 'checking' : stats().waStatus}
            </Badge>
            <h1 class="mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">WA Gate BPS Kabupaten Buton Selatan</h1>
            <p class="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">Command center untuk koneksi WhatsApp, inbox real-time, chatbot, template, API key, dan blast queue dengan anti-ban delay.</p>
          </div>
          <div class="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 backdrop-blur">
            <MiniMetric label="Inbox hari ini" value={loading() ? '...' : stats().messagesToday} />
            <MiniMetric label="Template aktif" value={loading() ? '...' : stats().templates} />
            <MiniMetric label="Blast aktif" value={loading() ? '...' : stats().activeBlast} />
            <MiniMetric label="Mode" value="Primary/Backup" />
          </div>
        </div>
      </section>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Messages Today" value={loading() ? '...' : stats().messagesToday} tone="emerald" detail="Pesan masuk/keluar yang tercatat hari ini" />
        <StatCard title="Active Templates" value={loading() ? '...' : stats().templates} tone="blue" detail="Template siap dipakai chatbot dan blast" />
        <StatCard title="WA Runtime" value={loading() ? '...' : stats().waStatus} tone="violet" detail="Primary Windows, backup Koyeb" />
        <StatCard title="Active Blast" value={loading() ? '...' : stats().activeBlast} tone="amber" detail="Job berjalan dengan delay 60–90 detik" />
      </div>

      <section class="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card class="border-white/70 bg-white/80 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
          <CardContent class="p-5">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Aksi cepat</h2>
                <p class="text-sm text-slate-500 dark:text-slate-400">Shortcut operasional harian.</p>
              </div>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <For each={quick}>{(item) => (
                <a href={item.href} target={item.href === '/inbox-live' ? '_blank' : undefined} class="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-400/40">
                  <p class="font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.value}</p>
                </a>
              )}</For>
            </div>
          </CardContent>
        </Card>

        <Card class="border-white/70 bg-white/80 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
          <CardContent class="p-5">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Status operasional</h2>
            <div class="mt-4 space-y-3">
              <StatusLine label="Windows runtime" value="Primary" />
              <StatusLine label="Koyeb runtime" value="Backup" />
              <StatusLine label="Session backup" value="Database WA Gate" />
              <StatusLine label="Anti-ban" value="Typing + random delay" />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function MiniMetric(props: { label: string; value: string | number }) {
  return <div class="rounded-2xl bg-slate-950/30 p-3"><p class="text-xs text-slate-300">{props.label}</p><p class="mt-1 text-xl font-semibold text-white">{props.value}</p></div>
}

function StatCard(props: { title: string; value: string | number; detail: string; tone: 'emerald' | 'blue' | 'violet' | 'amber' }) {
  const tone = () => ({ emerald: 'from-emerald-500 to-teal-500', blue: 'from-blue-500 to-cyan-500', violet: 'from-violet-500 to-fuchsia-500', amber: 'from-amber-500 to-orange-500' })[props.tone]
  return (
    <Card class="overflow-hidden border-white/70 bg-white/85 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.85)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
      <CardContent class="p-5">
        <div class={`mb-5 h-1.5 w-16 rounded-full bg-gradient-to-r ${tone()}`} />
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{props.title}</p>
        <p class="mt-2 truncate text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{props.value}</p>
        <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{props.detail}</p>
      </CardContent>
    </Card>
  )
}

function StatusLine(props: { label: string; value: string }) {
  return <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"><span class="text-slate-500 dark:text-slate-400">{props.label}</span><span class="font-medium text-slate-900 dark:text-white">{props.value}</span></div>
}
