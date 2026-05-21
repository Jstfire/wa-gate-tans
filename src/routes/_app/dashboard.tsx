import { createFileRoute } from '@tanstack/solid-router'
import { createQuery } from '@tanstack/solid-query'
import { Show } from 'solid-js'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

function fetchWithAuth(url: string) {
  const token = localStorage.getItem('wa-gate-token')
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  })
}

function DashboardPage() {
  const messagesQuery = createQuery(() => ({
    queryKey: ['messages-today'],
    queryFn: () => fetchWithAuth('/api/messages?today=true'),
  }))

  const templatesQuery = createQuery(() => ({
    queryKey: ['templates'],
    queryFn: () => fetchWithAuth('/api/templates'),
  }))

  const waStatusQuery = createQuery(() => ({
    queryKey: ['wa-status'],
    queryFn: () => fetchWithAuth('/api/wa/status'),
  }))

  const blastQuery = createQuery(() => ({
    queryKey: ['blast-active'],
    queryFn: () => fetchWithAuth('/api/blast?status=active'),
  }))

  return (
    <div class="flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your WhatsApp Gateway
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Messages Today */}
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Messages Today
              </p>
              <Badge variant="info">Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Show
              when={!messagesQuery.isLoading}
              fallback={<Skeleton />}
            >
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {messagesQuery.data?.count ?? 0}
              </p>
            </Show>
          </CardContent>
        </Card>

        {/* Active Templates */}
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Templates
              </p>
              <Badge variant="default">Templates</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Show
              when={!templatesQuery.isLoading}
              fallback={<Skeleton />}
            >
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {templatesQuery.data?.total ?? 0}
              </p>
            </Show>
          </CardContent>
        </Card>

        {/* WA Status */}
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                WA Status
              </p>
              <Show
                when={waStatusQuery.data?.status === 'connected'}
                fallback={<Badge variant="danger">Offline</Badge>}
              >
                <Badge variant="success">Online</Badge>
              </Show>
            </div>
          </CardHeader>
          <CardContent>
            <Show
              when={!waStatusQuery.isLoading}
              fallback={<Skeleton />}
            >
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {waStatusQuery.data?.status ?? 'Unknown'}
              </p>
            </Show>
          </CardContent>
        </Card>

        {/* Active Blast Jobs */}
        <Card>
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
                Active Blast Jobs
              </p>
              <Badge variant="warning">Running</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Show
              when={!blastQuery.isLoading}
              fallback={<Skeleton />}
            >
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {blastQuery.data?.count ?? 0}
              </p>
            </Show>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div class="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
  )
}
