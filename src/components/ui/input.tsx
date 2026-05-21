import {  splitProps } from 'solid-js'
import type {JSX} from 'solid-js';
import { clsx } from 'clsx'

type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['label', 'error', 'class'])
  return (
    <div class="flex flex-col gap-1">
      {local.label && <label class="text-sm font-medium text-slate-700 dark:text-slate-300">{local.label}</label>}
      <input
        class={clsx(
          'h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
          local.error && 'border-red-500 focus:ring-red-500',
          local.class,
        )}
        {...rest}
      />
      {local.error && <span class="text-xs text-red-500">{local.error}</span>}
    </div>
  )
}
