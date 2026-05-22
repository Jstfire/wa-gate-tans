import { createFileRoute, useNavigate } from '@tanstack/solid-router'
import { createSignal, For, Show } from 'solid-js'
import { useAuth } from '../contexts/auth'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const capabilities = [
  { title: 'WhatsApp Runtime', detail: 'Primary Windows PC dengan backup Koyeb dan failover otomatis.' },
  { title: 'Inbox Real-time', detail: 'Tampilan chat operasional, riwayat percakapan, status kirim, dan typing indicator.' },
  { title: 'Chatbot PST', detail: 'Rule layanan BPS, fallback response, dan alur otomatis dari template lama.' },
  { title: 'WA Blast Aman', detail: 'Queue blast dengan random delay 60–90 detik dan human-like typing simulation.' },
]

const metrics = [
  { label: 'Runtime', value: 'Primary + Backup' },
  { label: 'Pengiriman', value: 'Human-like' },
  { label: 'Kontrol', value: 'Role Based' },
]

function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [loading, setLoading] = createSignal(false)

  if (isAuthenticated()) navigate({ to: '/dashboard' })

  const handleSubmit = async (event: Event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username(), password())
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main class="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,168,132,0.35),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.24),transparent_34%),linear-gradient(135deg,#020617,#0f172a_45%,#052e2b)]" />
      <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-400/10 to-transparent" />

      <section class="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
        <div class="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-emerald-950/40 backdrop-blur md:p-8">
          <header class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-lg font-black text-emerald-950 shadow-lg shadow-emerald-500/20">WA</div>
              <div>
                <p class="text-lg font-semibold tracking-tight">WA Gate</p>
                <p class="text-xs uppercase tracking-[0.28em] text-emerald-200/70">BPS Buton Selatan</p>
              </div>
            </div>
            <div class="hidden rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-100 md:block">Secure operational console</div>
          </header>

          <div class="my-10 max-w-3xl lg:my-0">
            <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm text-emerald-100">
              <span class="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" />
              Sistem WhatsApp terpadu untuk layanan PST dan komunikasi BPS
            </div>
            <h1 class="text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Command center WhatsApp untuk pelayanan statistik yang lebih cepat.
            </h1>
            <p class="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              Kelola inbox, chatbot, template pesan, konten layanan, API key, dan blast queue dari satu dashboard modern dengan kontrol pengiriman yang aman.
            </p>

            <div class="mt-8 grid gap-3 sm:grid-cols-3">
              <For each={metrics}>{(metric) => (
                <div class="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                  <p class="text-xs text-slate-400">{metric.label}</p>
                  <p class="mt-2 text-sm font-semibold text-white">{metric.value}</p>
                </div>
              )}</For>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <For each={capabilities}>{(item) => (
              <article class="rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-emerald-300/30 hover:bg-white/[0.08]">
                <div class="mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300" />
                <h2 class="text-sm font-semibold text-white">{item.title}</h2>
                <p class="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
              </article>
            )}</For>
          </div>
        </div>

        <div class="flex items-center justify-center lg:justify-end">
          <div class="w-full max-w-md rounded-[2rem] border border-white/12 bg-white p-2 shadow-2xl shadow-black/30 dark:bg-slate-900">
            <div class="rounded-[1.65rem] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-950 md:p-7">
              <div class="mb-7">
                <p class="text-sm font-medium text-emerald-600 dark:text-emerald-300">Masuk Dashboard</p>
                <h2 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Selamat datang kembali</h2>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Masuk untuk mengelola layanan WhatsApp resmi BPS Kabupaten Buton Selatan.</p>
              </div>

              <form onSubmit={handleSubmit} class="space-y-4">
                <Show when={error()}>
                  <div class="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">{error()}</div>
                </Show>

                <label class="block">
                  <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Username</span>
                  <input
                    type="text"
                    value={username()}
                    onInput={(event) => setUsername(event.currentTarget.value)}
                    placeholder="Masukkan username"
                    autocomplete="username"
                    class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </label>

                <label class="block">
                  <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
                  <input
                    type="password"
                    value={password()}
                    onInput={(event) => setPassword(event.currentTarget.value)}
                    placeholder="Masukkan password"
                    autocomplete="current-password"
                    class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                  />
                </label>

                <Button type="submit" disabled={loading()} class="h-12 w-full rounded-2xl bg-emerald-500 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-60">
                  {loading() ? 'Memverifikasi...' : 'Masuk ke WA Gate'}
                </Button>
              </form>

              <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/70">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Modul tersedia</p>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Inbox Live, WA Connection, Template, Chatbot, Konten Layanan, API Keys, dan WA Blast.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
