import { createFileRoute } from '@tanstack/solid-router'
import { createSignal, For, Show } from 'solid-js'
import { createQuery, createMutation, useQueryClient } from '@tanstack/solid-query'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { authHeader } from '../../contexts/auth'

export const Route = createFileRoute('/_app/inbox')({
  component: InboxPage,
})

type Contact = {
  id: string
  phoneNumber: string
  name: string | null
  lastMessageAt: string | null
  hasChatHistory: boolean
}

type Message = {
  id: string
  waMessageId: string
  fromNumber: string
  toNumber: string
  messageType: string
  content: string | null
  direction: string
  status: string
  isFromBot: boolean
  createdAt: string
}

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url, { headers: authHeader() }).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<T>
  })
}

function InboxPage() {
  const queryClient = useQueryClient()
  const [selectedContact, setSelectedContact] = createSignal<string | null>(null)
  const [messageText, setMessageText] = createSignal('')

  const contactsQuery = createQuery(() => ({
    queryKey: ['contacts'],
    queryFn: () => fetchJson<Contact[]>('/api/messages/contacts'),
    refetchInterval: 10000,
  }))

  const conversationQuery = createQuery(() => ({
    queryKey: ['conversation', selectedContact()],
    queryFn: () => fetchJson<Message[]>(`/api/messages/conversation/${selectedContact()}`),
    enabled: !!selectedContact(),
    refetchInterval: 5000,
  }))

  const sendMutation = createMutation(() => ({
    mutationFn: async (data: { to: string; message: string }) => {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to send')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedContact()] })
      setMessageText('')
    },
  }))

  const handleSend = () => {
    const phone = selectedContact()
    const msg = messageText().trim()
    if (!phone || !msg) return
    sendMutation.mutate({ to: phone, message: msg })
  }

  return (
    <div class="flex h-[calc(100vh-7rem)] flex-col gap-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <div class="flex flex-1 overflow-hidden">
        {/* Contact list */}
        <div class="flex w-80 flex-col border-r border-gray-200 dark:border-gray-700">
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Inbox</h2>
          </div>
          <div class="flex-1 overflow-y-auto">
            <Show when={!contactsQuery.isLoading} fallback={<LoadingSkeleton />}>
              <For each={contactsQuery.data ?? []}>
                {(contact) => (
                  <button
                    type="button"
                    onClick={() => setSelectedContact(contact.phoneNumber)}
                    class={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${selectedContact() === contact.phoneNumber ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                  >
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      {(contact.name ?? contact.phoneNumber).charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {contact.name ?? contact.phoneNumber}
                      </p>
                      <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                        {contact.phoneNumber}
                      </p>
                    </div>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* Chat area */}
        <div class="flex flex-1 flex-col">
          <Show when={selectedContact()} fallback={<EmptyChat />}>
            {/* Chat header */}
            <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                {selectedContact()!.charAt(0)}
              </div>
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{selectedContact()}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">WhatsApp</p>
              </div>
            </div>

            {/* Messages */}
            <div class="flex-1 overflow-y-auto bg-gray-100 p-4 dark:bg-gray-900">
              <Show when={!conversationQuery.isLoading} fallback={<LoadingSkeleton />}>
                <div class="flex flex-col gap-2">
                  <For each={conversationQuery.data ?? []}>
                    {(msg) => (
                      <div class={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div class={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${msg.direction === 'outbound' ? 'bg-green-500 text-white' : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-white'}`}>
                          <p>{msg.content}</p>
                          <div class={`mt-1 flex items-center gap-1 text-xs ${msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'}`}>
                            <span>{new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                            <Show when={msg.direction === 'outbound'}>
                              <Badge variant={msg.status === 'read' ? 'success' : msg.status === 'delivered' ? 'secondary' : 'default'}>
                                {msg.status}
                              </Badge>
                            </Show>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Input */}
            <div class="flex items-center gap-3 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <input
                type="text"
                value={messageText()}
                onInput={(e) => setMessageText(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ketik pesan..."
                class="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <Button onClick={handleSend} disabled={!messageText().trim() || sendMutation.isPending} size="icon" class="rounded-full bg-green-600 hover:bg-green-700">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </Button>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}

function EmptyChat() {
  return (
    <div class="flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div class="text-center">
        <svg class="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Pilih kontak untuk memulai percakapan</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div class="flex flex-col gap-3 p-4">
      <For each={Array.from({ length: 5 })}>
        {() => <div class="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />}
      </For>
    </div>
  )
}
