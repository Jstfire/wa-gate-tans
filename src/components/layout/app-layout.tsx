import { createSignal,  Show } from 'solid-js'
import type {ParentComponent} from 'solid-js';
import { ToastProvider } from '../ui/toast'
import { Sidebar } from './sidebar'
import { Header } from './header'

export const AppLayout: ParentComponent = (props) => {
  const [collapsed, setCollapsed] = createSignal(false)
  const [mobileOpen, setMobileOpen] = createSignal(false)

  const toggleSidebar = () => {
    // On mobile toggle visibility, on desktop toggle collapse
    if (window.innerWidth < 768) {
      setMobileOpen((v) => !v)
    } else {
      setCollapsed((v) => !v)
    }
  }

  return (
    <ToastProvider>
      <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Mobile overlay */}
        <Show when={mobileOpen()}>
          <div
            class="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        </Show>

        {/* Sidebar — hidden on mobile unless open */}
        <div
          class={[
            'fixed inset-y-0 left-0 z-30 md:relative md:flex',
            mobileOpen() ? 'flex' : 'hidden md:flex',
          ].join(' ')}
        >
          <Sidebar collapsed={collapsed()} />
        </div>

        {/* Main area */}
        <div class="flex flex-1 flex-col overflow-hidden">
          <Header onToggleSidebar={toggleSidebar} />
          <main class="flex-1 overflow-y-auto p-6">
            {props.children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
