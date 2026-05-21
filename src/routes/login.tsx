import { createFileRoute, useNavigate } from '@tanstack/solid-router'
import { createSignal } from 'solid-js'
import { useAuth } from '../contexts/auth'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [loading, setLoading] = createSignal(false)

  if (isAuthenticated()) {
    navigate({ to: '/dashboard' })
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username(), password())
      navigate({ to: '/dashboard' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <Card class="w-full max-w-md">
        <CardHeader>
          <CardTitle class="text-center text-2xl">
            <span class="text-green-600 dark:text-green-400">WA Gate</span>
          </CardTitle>
          <p class="text-center text-sm text-gray-500 dark:text-gray-400">
            BPS Kabupaten Buton Selatan
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} class="flex flex-col gap-4">
            {error() && (
              <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {error()}
              </div>
            )}
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                type="text"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                placeholder="Enter your username"
                autocomplete="username"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder="Enter your password"
                autocomplete="current-password"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <Button type="submit" disabled={loading()} class="mt-2 w-full bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600">
              {loading() ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
