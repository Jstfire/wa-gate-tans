import { useLocation } from '@tanstack/solid-router'
import { For  } from 'solid-js'
import type {JSX} from 'solid-js'
import { cn } from '../../lib/cn'

type NavItem = {
  label: string
  href: string
  icon: JSX.Element
  external?: boolean
}

const IconHome = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
)
const IconPhone = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
  </svg>
)
const IconChat = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)
const IconDocument = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)
const IconGear = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)
const IconUsers = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const IconFolder = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
)
const IconMegaphone = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
)
const IconKey = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
)
const IconShield = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconCog = () => (
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
)

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <IconHome /> },
  { label: 'WA Connection', href: '/wa-connection', icon: <IconPhone /> },
  { label: 'Inbox', href: '/inbox-live', icon: <IconChat />, external: true },
  { label: 'Templates', href: '/templates', icon: <IconDocument /> },
  { label: 'Chatbot Rules', href: '/chatbot', icon: <IconGear /> },
  { label: 'Nomor Petugas', href: '/officers', icon: <IconUsers /> },
  { label: 'Manajemen Konten', href: '/content', icon: <IconFolder /> },
  { label: 'WA Blast', href: '/blast', icon: <IconMegaphone /> },
  { label: 'API Keys', href: '/api-keys', icon: <IconKey /> },
  { label: 'Users & Roles', href: '/users', icon: <IconShield /> },
  { label: 'Settings', href: '/settings', icon: <IconCog /> },
]

type SidebarProps = {
  collapsed: boolean
}

export function Sidebar(props: SidebarProps) {
  const location = useLocation()
  // useLocation returns an Accessor in @tanstack/solid-router

  return (
    <aside
      class={cn(
        'm-4 mr-0 flex h-[calc(100%-2rem)] flex-col rounded-3xl border border-white/70 bg-slate-950 text-white shadow-[0_24px_80px_-40px_rgba(2,6,23,0.95)] transition-all duration-300 dark:border-white/10 dark:bg-slate-950/80',
        props.collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div class={cn('flex h-20 items-center border-b border-white/10', props.collapsed ? 'justify-center px-2' : 'px-5')}>
        {props.collapsed ? (
          <span class="rounded-2xl bg-emerald-500 px-3 py-2 text-xl font-bold text-white">W</span>
        ) : (
          <div>
            <span class="text-xl font-bold tracking-tight text-white">WA Gate</span>
            <p class="text-xs text-emerald-300">BPS Buton Selatan</p>
          </div>
        )}
      </div>
      <nav class="flex-1 overflow-y-auto py-4">
        <ul class="flex flex-col gap-1 px-2">
          <For each={navItems}>
            {(item) => {
              const isActive = () => location().pathname.startsWith(item.href)
              return (
                <li>
                  <a
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    class={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive()
                        ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/20'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                      props.collapsed && 'justify-center px-2',
                    )}
                    title={props.collapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!props.collapsed && <span>{item.label}</span>}
                  </a>
                </li>
              )
            }}
          </For>
        </ul>
      </nav>
    </aside>
  )
}
