import {
  createContext,
  createSignal,
  For,
  onCleanup,
  useContext
  
} from 'solid-js'
import type {ParentComponent} from 'solid-js';
import { cn } from '../../lib/cn'

type ToastKind = 'success' | 'error' | 'info'

type ToastItem = {
  id: number
  kind: ToastKind
  message: string
}

type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi>()

export const ToastProvider: ParentComponent = (props) => {
  const [items, setItems] = createSignal<ToastItem[]>([])
  const timers = new Set<number>()

  const dismiss = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const push = (kind: ToastKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems((current) => [...current, { id, kind, message }])
    const timer = window.setTimeout(() => dismiss(id), 4000)
    timers.add(timer)
  }

  onCleanup(() => {
    timers.forEach((timer) => window.clearTimeout(timer))
  })

  const api: ToastApi = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
  }

  return (
    <ToastContext.Provider value={api}>
      {props.children}
      <div class="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-3">
        <For each={items()}>
          {(item) => (
            <div
              class={cn(
                'rounded-lg border p-4 text-sm shadow-lg',
                item.kind === 'success' &&
                  'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
                item.kind === 'error' &&
                  'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
                item.kind === 'info' &&
                  'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
              )}
            >
              {item.message}
            </div>
          )}
        </For>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
