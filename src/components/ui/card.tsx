import {  splitProps } from 'solid-js'
import type {JSX} from 'solid-js';
import { clsx } from 'clsx'

type DivProps = JSX.HTMLAttributes<HTMLDivElement>

export function Card(props: DivProps) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div
      class={clsx('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950', local.class)}
      {...rest}
    >
      {local.children}
    </div>
  )
}

export function CardHeader(props: DivProps) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div class={clsx('flex flex-col gap-1.5 p-6', local.class)} {...rest}>
      {local.children}
    </div>
  )
}

export function CardTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <h3 class={clsx('text-lg font-semibold text-slate-900 dark:text-slate-100', local.class)} {...rest}>
      {local.children}
    </h3>
  )
}

export function CardContent(props: DivProps) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div class={clsx('p-6 pt-0', local.class)} {...rest}>
      {local.children}
    </div>
  )
}
