/**
 * Shared auth verification utility.
 * Used by route beforeLoad hooks and API call interceptors.
 */

const AUTH_CHECK_INTERVAL_MS = 5 * 60 * 1000
let lastServerCheck = 0
let lastServerResult = false

function clearAuth() {
  localStorage.removeItem('wa-gate-token')
  localStorage.removeItem('wa-gate-user')
}

function isTokenLocallyValid(): boolean {
  const token = localStorage.getItem('wa-gate-token')
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    if (!payload.exp) return true
    return payload.exp * 1000 > Date.now()
  } catch {
    clearAuth()
    return false
  }
}

async function isTokenServerValid(): Promise<boolean> {
  const now = Date.now()
  if (now - lastServerCheck < AUTH_CHECK_INTERVAL_MS && lastServerResult) return true

  const token = localStorage.getItem('wa-gate-token')
  if (!token) return false

  try {
    const res = await fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    lastServerCheck = now
    lastServerResult = res.ok
    if (!res.ok) clearAuth()
    return res.ok
  } catch {
    return lastServerResult
  }
}

export async function isAuthenticated(): Promise<boolean> {
  if (!isTokenLocallyValid()) {
    clearAuth()
    return false
  }
  return isTokenServerValid()
}

export function handleAuthResponse(res: Response): Response {
  if (res.status === 401 || res.status === 403) {
    clearAuth()
    if (typeof window !== 'undefined') window.location.href = '/login'
  }
  return res
}

export function resetAuthCache() {
  lastServerCheck = 0
  lastServerResult = false
}

/**
 * Install a global fetch interceptor that redirects to /login on 401/403.
 * Call once from AuthProvider onMount. Safe to call multiple times.
 */
export function setupGlobalAuthInterceptor() {
  if (typeof window === 'undefined') return
  if ((window as unknown as Record<string, boolean>).__authInterceptorInstalled) return
  ;(window as unknown as Record<string, boolean>).__authInterceptorInstalled = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    const res = await originalFetch(...args)

    // Don't redirect on login/verify endpoints themselves
    const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url
    if (url.includes('/api/auth/login') || url.includes('/api/auth/verify')) return res

    if (res.status === 401 || res.status === 403) {
      clearAuth()
      window.location.href = '/login'
    }
    return res
  }
}
