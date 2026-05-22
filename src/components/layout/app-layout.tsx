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
      <div class="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#dcfce7_0,transparent_34%),linear-gradient(135deg,#f8fafc_0%,#ecfdf5_55%,#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18)_0,transparent_32%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#052e1a_100%)]">
        <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#00a884] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#07130f]">
          Lewati ke konten utama
        </a>
        {/* Mobile overlay */}
        <Show when={mobileOpen()}>
          <div
            class="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
            role="button"
            tabindex="0"
            aria-label="Tutup menu navigasi"
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setMobileOpen(false)
            }}
          />
        </Show>

        {/* Sidebar — hidden on mobile unless open */}
        <div
          class={[
            'fixed inset-y-0 left-0 z-30 md:static md:flex',
            mobileOpen() ? 'flex' : 'hidden md:flex',
          ].join(' ')}
        >
          <Sidebar collapsed={collapsed()} />
        </div>

        {/* Main area */}
        <div class="flex flex-1 flex-col overflow-hidden">
          <Header onToggleSidebar={toggleSidebar} />
          <main id="main-content" class="flex-1 overflow-y-auto p-4 md:p-6">
            {props.children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
