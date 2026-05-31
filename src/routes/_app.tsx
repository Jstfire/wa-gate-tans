import { createFileRoute, Outlet, redirect } from '@tanstack/solid-router'
import { AppLayout } from '../components/layout/app-layout'
import { isAuthenticated } from '../lib/auth-check'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const ok = await isAuthenticated()
    if (!ok) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppLayoutRoute,
})

function AppLayoutRoute() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
