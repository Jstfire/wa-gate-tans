// @ts-ignore - this catch-all route is handled by the custom worker entry
import { createServerFileRoute } from '@tanstack/solid-start/server'
import api from '../../api/index'

export const ServerRoute = createServerFileRoute('/api/$').methods({
  GET: ({ request }) => api.fetch(request),
  POST: ({ request }) => api.fetch(request),
  PUT: ({ request }) => api.fetch(request),
  DELETE: ({ request }) => api.fetch(request),
  PATCH: ({ request }) => api.fetch(request),
  OPTIONS: ({ request }) => api.fetch(request),
})
