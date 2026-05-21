import {  splitProps } from 'solid-js'
import type {JSX} from 'solid-js';
import { clsx } from 'clsx'

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const variants: Record<string, string> = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
  destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  outline: 'border border-slate-300 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
  secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
}

const sizes: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-base',
  icon: 'h-8 w-8 p-0',
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'children'])
  return (
    <button
      class={clsx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
        variants[local.variant ?? 'default'],
        sizes[local.size ?? 'md'],
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </button>
  )
}
