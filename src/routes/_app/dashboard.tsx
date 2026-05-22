import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, onMount } from 'solid-js'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { authHeader } from '../../contexts/auth'

type DashboardStats = {
  messagesToday: number
  templates: number
  waStatus: string
  activeBlast: number
}

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

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
  const [stats, setStats] = createSignal<DashboardStats>({
    messagesToday: 0,
    templates: 0,
    waStatus: 'unknown',
    activeBlast: 0,
  })

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

  return (
    <div class="flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Overview of your WhatsApp Gateway</p>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Messages Today" badge="Live" value={loading() ? '...' : stats().messagesToday} />
        <StatCard title="Active Templates" badge="Templates" value={loading() ? '...' : stats().templates} />
        <StatCard
          title="WA Status"
          badge={stats().waStatus === 'connected' ? 'Online' : 'Offline'}
          value={loading() ? '...' : stats().waStatus}
          badgeVariant={stats().waStatus === 'connected' ? 'success' : 'destructive'}
        />
        <StatCard title="Active Blast Jobs" badge="Running" value={loading() ? '...' : stats().activeBlast} badgeVariant="warning" />
      </div>
    </div>
  )
}

type StatCardProps = {
  title: string
  badge: string
  value: string | number
  badgeVariant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
}

function StatCard(props: StatCardProps) {
  return (
    <Card>
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{props.title}</p>
          <Badge variant={props.badgeVariant ?? 'secondary'}>{props.badge}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{props.value}</p>
      </CardContent>
    </Card>
  )
}
