import { createFileRoute, Outlet, redirect } from '@tanstack/solid-router'
import { AppLayout } from '../components/layout/app-layout'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('wa-gate-token')
    if (!token) {
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
