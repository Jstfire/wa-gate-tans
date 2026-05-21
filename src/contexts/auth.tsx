import { createContext, useContext, createSignal, onMount  } from 'solid-js'
import type {JSX} from 'solid-js';

export type AuthUser = {
  id: string
  username?: string
  name?: string
  roles: string[]
}

type AuthContextValue = {
  user: () => AuthUser | null
  isAuthenticated: () => boolean
  isLoading: () => boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextValue>()

export function AuthProvider(props: { children: JSX.Element }) {
  const [user, setUser] = createSignal<AuthUser | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)

  const getToken = () => localStorage.getItem('wa-gate-token')

  const isAuthenticated = () => !!user()

  onMount(async () => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = (await res.json()) as AuthUser
        setUser(data)
      } else {
        localStorage.removeItem('wa-gate-token')
      }
    } catch {
      localStorage.removeItem('wa-gate-token')
    } finally {
      setIsLoading(false)
    }
  })

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = (await res.json()) as { error?: string }
      throw new Error(err.error ?? 'Login failed')
    }
    const data = (await res.json()) as { token: string; user: AuthUser }
    localStorage.setItem('wa-gate-token', data.token)
    setUser(data.user)
  }

  const logout = async () => {
    const token = getToken()
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch { /* ignore */ }
    }
    localStorage.removeItem('wa-gate-token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, getToken }}>
      {props.children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const authHeader = (): Record<string, string> => ({
  Authorization: `Bearer ${localStorage.getItem('wa-gate-token') ?? ''}`,
})
