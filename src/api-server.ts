import { serve } from '@hono/node-server'
import api from './api/index'

const port = 3001
serve({ fetch: api.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})
