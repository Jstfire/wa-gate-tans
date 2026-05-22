import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import solidPlugin from 'vite-plugin-solid'
import { cloudflare } from '@cloudflare/vite-plugin'
import type { Plugin } from 'vite'

/**
 * Override virtual:cloudflare/worker-entry so /api/* goes to Hono
 * and everything else goes to TanStack Start SSR.
 * Also adds dev-server middleware for local development.
 */
function customWorkerEntry(): Plugin {
  const virtualId = 'virtual:cloudflare/worker-entry'
  const resolvedId = '\0' + virtualId

  return {
    name: 'custom-worker-entry',
    enforce: 'pre',

    // Dev server middleware: intercept /api/* before TanStack Start
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          const { default: api } = await server.ssrLoadModule('/src/api/index.ts')
          const base = `http://${req.headers.host ?? 'localhost'}`
          const request = new Request(base + req.url, {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : req as unknown as BodyInit,
          })
          const response: Response = await api.fetch(request)
          res.statusCode = response.status
          response.headers.forEach((v: string, k: string) => res.setHeader(k, v))
          const body = await response.arrayBuffer()
          res.end(Buffer.from(body))
        } catch (err) {
          console.error('[api middleware]', err)
          next(err)
        }
      })
    },

    resolveId(id) {
      if (id === virtualId) return resolvedId
    },
    load(id) {
      if (id !== resolvedId) return
      return `
import { createStartHandler, defaultStreamHandler } from '@tanstack/solid-start/server'
import api from '/src/api/index'

const startFetch = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return api.fetch(request, env, ctx)
    }
    return startFetch(request, env, ctx)
  }
}
`
    },
  }
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    customWorkerEntry(),
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart(),
    solidPlugin({ ssr: true }),
  ],
})
