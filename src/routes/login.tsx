import { createFileRoute, useNavigate } from '@tanstack/solid-router'
import { createSignal, For, Show } from 'solid-js'
import { useAuth } from '../contexts/auth'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const features = ['Inbox Live', 'Chatbot PST', 'Template Pesan', 'WA Blast', 'Konten Layanan', 'API Keys']

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
    <main class="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b141a] dark:text-white">
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div class="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(240,253,244,0.97),rgba(236,253,245,0.98))] dark:bg-[linear-gradient(135deg,rgba(17,27,33,0.96),rgba(11,20,26,0.98))]" />
      </div>

      <section class="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_420px] lg:px-8">
        <div class="max-w-2xl">
          <div class="mb-8 flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00a884] text-lg font-black text-[#07130f] shadow-lg shadow-emerald-500/20">WA</div>
            <div>
              <p class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">WA Gate</p>
              <p class="text-xs uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-200/70">BPS Kabupaten Buton Selatan</p>
            </div>
          </div>

          <div class="mb-5 inline-flex rounded-full border border-emerald-300/40 bg-white/70 px-4 py-2 text-sm text-emerald-800 shadow-sm dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
            Platform layanan WhatsApp terpadu
          </div>

          <h1 class="text-4xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-5xl lg:text-6xl">
            Kelola layanan WhatsApp lebih cepat, rapi, dan aman.
          </h1>
          <p class="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
            Dashboard operasional untuk inbox, chatbot, template pesan, konten layanan, API key, dan pengiriman blast dengan kontrol human-like sending.
          </p>

          <div class="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
            <For each={features}>{(feature) => (
              <div class="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
                {feature}
              </div>
            )}</For>
          </div>
        </div>

        <div class="w-full rounded-[28px] border border-slate-200 bg-white/80 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/30">
          <div class="rounded-[22px] bg-white p-6 text-slate-950 shadow-xl dark:bg-[#111b21] dark:text-white md:p-7">
            <div class="mb-7">
              <p class="text-sm font-semibold text-[#00a884]">Masuk Dashboard</p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Selamat datang</h2>
              <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Masuk untuk melanjutkan pengelolaan WA Gate.</p>
            </div>

            <form onSubmit={handleSubmit} class="space-y-4">
              <Show when={error()}>
                <div class="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">{error()}</div>
              </Show>

              <label class="block">
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Username</span>
                <input
                  type="text"
                  value={username()}
                  onInput={(event) => setUsername(event.currentTarget.value)}
                  placeholder="Masukkan username"
                  autocomplete="username"
                  class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#00a884] focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-[#202c33] dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#202c33]"
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
                  class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#00a884] focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-[#202c33] dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#202c33]"
                />
              </label>

              <Button type="submit" disabled={loading()} class="h-12 w-full rounded-2xl bg-[#00a884] text-sm font-semibold text-[#07130f] shadow-lg shadow-emerald-500/20 hover:bg-[#06cf9c] disabled:opacity-60">
                {loading() ? 'Memverifikasi...' : 'Masuk ke WA Gate'}
              </Button>
            </form>

            <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#202c33]">
              <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">Keunggulan</p>
              <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Real-time, responsif, dark/light mode, dan siap untuk operasional layanan harian.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
