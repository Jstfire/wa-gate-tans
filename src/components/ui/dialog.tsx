import {  Show, splitProps } from 'solid-js'
import type {JSX} from 'solid-js';
import { clsx } from 'clsx'

type DialogProps = {
  open: boolean
  onClose: () => void
  children: JSX.Element
}

type DialogContentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  class?: string
  children: JSX.Element
}

export function Dialog(props: DialogProps) {
  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div
          class="absolute inset-0 bg-black/50"
          onClick={props.onClose}
        />
        <div class="relative z-10 w-full max-w-lg">
          {props.children}
        </div>
      </div>
    </Show>
  )
}

export function DialogContent(props: DialogContentProps) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div
      class={clsx(
        'rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950',
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  )
}

export function DialogHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div class={clsx('mb-4 flex items-center justify-between', local.class)} {...rest}>
      {local.children}
    </div>
  )
}

export function DialogTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <h2 class={clsx('text-lg font-semibold text-slate-900 dark:text-slate-100', local.class)} {...rest}>
      {local.children}
    </h2>
  )
}

export function DialogFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div class={clsx('mt-6 flex justify-end gap-2', local.class)} {...rest}>
      {local.children}
    </div>
  )
}
