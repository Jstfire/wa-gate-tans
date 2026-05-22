/**
 * Supabase REST client — HTTP/fetch based, fully compatible with Cloudflare Workers.
 * Replaces postgres-js sockets which fail with CF Workers I/O isolation.
 */

type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

interface RestOptions {
  select?: string
  filter?: Record<string, string>
  order?: string
  limit?: number
  offset?: number
  single?: boolean
}

interface RpcOptions {
  args?: Record<string, Json>
}

function makeHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Prefer: 'return=representation',
  }
}

function makeRpcHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

function buildUrl(base: string, table: string, opts: RestOptions = {}): string {
  const url = new URL(`${base}/rest/v1/${table}`)
  if (opts.select) url.searchParams.set('select', opts.select)
  if (opts.filter) {
    for (const [k, v] of Object.entries(opts.filter)) {
      url.searchParams.set(k, v)
    }
  }
  if (opts.order) url.searchParams.set('order', opts.order)
  if (opts.limit !== undefined) url.searchParams.set('limit', String(opts.limit))
  if (opts.offset !== undefined) url.searchParams.set('offset', String(opts.offset))
  return url.toString()
}

export function createRestClient(supabaseUrl: string, serviceRoleKey: string) {
  const headers = makeHeaders(serviceRoleKey)

  return {
    /** SELECT rows */
    async select<T = Record<string, Json>>(table: string, opts: RestOptions = {}): Promise<T[]> {
      const url = buildUrl(supabaseUrl, table, opts)
      const res = await fetch(url, { headers, cache: 'no-store' })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`REST select ${table}: ${res.status} ${err}`)
      }
      return res.json() as Promise<T[]>
    },

    /** SELECT single row */
    async selectOne<T = Record<string, Json>>(table: string, opts: RestOptions = {}): Promise<T | null> {
      const rows = await this.select<T>(table, { ...opts, limit: 1 })
      return rows[0] ?? null
    },

    /** INSERT row(s) */
    async insert<T = Record<string, Json>>(table: string, data: Record<string, Json> | Record<string, Json>[]): Promise<T[]> {
      const url = `${supabaseUrl}/rest/v1/${table}`
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`REST insert ${table}: ${res.status} ${err}`)
      }
      return res.json() as Promise<T[]>
    },

    /** UPDATE rows matching filter */
    async update<T = Record<string, Json>>(table: string, data: Record<string, Json>, filter: Record<string, string>): Promise<T[]> {
      const url = buildUrl(supabaseUrl, table, { filter })
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`REST update ${table}: ${res.status} ${err}`)
      }
      return res.json() as Promise<T[]>
    },

    /** DELETE rows matching filter */
    async delete<T = Record<string, Json>>(table: string, filter: Record<string, string>): Promise<T[]> {
      const url = buildUrl(supabaseUrl, table, { filter })
      const res = await fetch(url, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`REST delete ${table}: ${res.status} ${err}`)
      }
      return res.json() as Promise<T[]>
    },

    /** Call a PostgreSQL RPC function — Supabase REST returns array or scalar */
    async rpc<T = Json>(fnName: string, opts: RpcOptions = {}): Promise<T> {
      const url = `${supabaseUrl}/rest/v1/rpc/${fnName}`
      const rpcHeaders = makeRpcHeaders(serviceRoleKey)
      // Add unique nonce to prevent CF Workers fetch deduplication
      rpcHeaders['X-Request-Id'] = crypto.randomUUID()
      const res = await fetch(url, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify(opts.args ?? {}),
        cache: 'no-store',
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(`REST rpc ${fnName}: ${res.status} ${err}`)
      }
      const data = await res.json()
      if (Array.isArray(data)) return data[0] as T
      return data as T
    },
  }
}

/** Per-request factory for wagate DB */
export function getWagateClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
  return createRestClient(url, key)
}

/** Per-request factory for induk DB (read-only) */
export function getIndukClient() {
  const url = process.env.SUPABASE_INDUK_URL
  const key = process.env.SUPABASE_INDUK_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_INDUK_URL or SUPABASE_INDUK_SERVICE_ROLE_KEY not set')
  return createRestClient(url, key)
}
