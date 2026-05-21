import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/solid-router'
import { HydrationScript } from 'solid-js/web'
import { Suspense } from 'solid-js'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { AuthProvider } from '../contexts/auth'
import { ThemeProvider } from '../contexts/theme'

import styleCss from '../styles.css?url'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
})

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [{ rel: 'stylesheet', href: styleCss }],
    meta: [
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
  }),
  shellComponent: RootComponent,
})

function RootComponent() {
  return (
    <html>
      <head>
        <HydrationScript />
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <Suspense>
                <Outlet />
              </Suspense>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
