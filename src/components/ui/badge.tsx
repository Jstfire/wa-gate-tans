import {  splitProps } from 'solid-js'
import type {JSX} from 'solid-js';
import { clsx } from 'clsx'

type BadgeProps = JSX.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
}

const variants: Record<string, string> = {
  default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  secondary: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  outline: 'border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300',
}

export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ['variant', 'class', 'children'])
  return (
    <span
      class={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[local.variant ?? 'default'],
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </span>
  )
}
