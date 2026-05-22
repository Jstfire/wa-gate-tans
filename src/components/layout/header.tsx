import { useAuth } from '../../contexts/auth'
import { useTheme } from '../../contexts/theme'
import { cn } from '../../lib/cn'

const IconMenu = () => (
  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const IconSun = () => (
  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const IconMoon = () => (
  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

const IconLogout = () => (
  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

type HeaderProps = {
  onToggleSidebar: () => void
}

export function Header(props: HeaderProps) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  const btnBase =
    'rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'

  return (
    <header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        class={btnBase}
        onClick={props.onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <IconMenu />
      </button>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class={btnBase}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme() === 'dark' ? <IconSun /> : <IconMoon />}
        </button>

        <div class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
            {(user()?.name ?? user()?.username ?? 'U').charAt(0).toUpperCase()}
          </div>
          <span class="hidden sm:block">{user()?.name ?? user()?.username ?? 'User'}</span>
        </div>

        <button
          type="button"
          class={cn(btnBase, 'text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950')}
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <IconLogout />
        </button>
      </div>
    </header>
  )
}
