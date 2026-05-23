import { createFileRoute, redirect } from '@tanstack/solid-router'
import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'

export const Route = createFileRoute('/inbox-live')({
  beforeLoad: () => { if (typeof window !== 'undefined' && !localStorage.getItem('wa-gate-token')) throw redirect({ to: '/login' }) },
  component: InboxLivePage,
})

type Contact = { id: string; phoneNumber: string; name: string | null; lastMessageAt: string | null; hasChatHistory: boolean }
type Message = { id: string; waMessageId: string; fromNumber: string; toNumber: string; messageType: string; content: string | null; direction: string; status: string; isFromBot: boolean; createdAt: string }

function tokenHeader(): HeadersInit { const token = typeof window === 'undefined' ? null : localStorage.getItem('wa-gate-token'); return token ? { Authorization: `Bearer ${token}` } : {} }
async function fetchJson<T>(url: string): Promise<T> { const res = await fetch(url, { headers: tokenHeader() }); if (!res.ok) throw new Error('Gagal memuat data'); return res.json() as Promise<T> }
function displayName(contact: Contact | undefined, phone: string | null): string { return contact?.name || contact?.phoneNumber || phone || 'Pilih chat' }
function initials(value: string): string { return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'WA' }
function formatTime(value: string | null): string { if (!value) return ''; return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') }

function InboxLivePage() {
  const [selectedContact, setSelectedContact] = createSignal<string | null>(null)
  const [messageText, setMessageText] = createSignal('')
  const [search, setSearch] = createSignal('')
  const [contacts, setContacts] = createSignal<Contact[]>([])
  const [messages, setMessages] = createSignal<Message[]>([])
  const [loadingContacts, setLoadingContacts] = createSignal(true)
  const [loadingMessages, setLoadingMessages] = createSignal(false)
  const [sending, setSending] = createSignal(false)
  const [lightMode, setLightMode] = createSignal(false)

  const applyTheme = (mode: 'light' | 'dark') => {
    setLightMode(mode === 'light')
    localStorage.setItem('theme', mode)
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }

  const loadContacts = async () => {
    const data = await fetchJson<Contact[]>('/api/messages/contacts')
    setContacts(data)
    if (!selectedContact() && data[0]) {
      setSelectedContact(data[0].phoneNumber)
      void loadMessages(true)
    }
    setLoadingContacts(false)
  }
  const sameMessages = (next: Message[]): boolean => {
    const current = messages()
    if (current.length !== next.length) return false
    return current.every((msg, index) => msg.id === next[index]?.id && msg.status === next[index]?.status && msg.content === next[index]?.content)
  }

  const loadMessages = async (showSkeleton = false) => {
    const phone = selectedContact(); if (!phone) return
    if (showSkeleton) setLoadingMessages(true)
    try {
      const next = await fetchJson<Message[]>(`/api/messages/conversation/${encodeURIComponent(phone)}`)
      if (!sameMessages(next)) setMessages(next)
    } finally {
      if (showSkeleton) setLoadingMessages(false)
    }
  }

  onMount(() => {
    applyTheme(localStorage.getItem('theme') === 'light' ? 'light' : 'dark')
    void loadContacts()
    const contactTimer = window.setInterval(() => { void loadContacts() }, 7000)
    const messageTimer = window.setInterval(() => { void loadMessages() }, 4000)
    onCleanup(() => { window.clearInterval(contactTimer); window.clearInterval(messageTimer) })
  })

  const filteredContacts = createMemo(() => { const term = search().toLowerCase().trim(); return term ? contacts().filter((contact) => `${contact.name ?? ''} ${contact.phoneNumber}`.toLowerCase().includes(term)) : contacts() })
  const activeContact = createMemo(() => contacts().find((contact) => contact.phoneNumber === selectedContact()))
  const chooseContact = (phone: string) => { setSelectedContact(phone); void loadMessages(true) }
  const handleSend = async () => {
    const to = selectedContact(), message = messageText().trim(); if (!to || !message || sending()) return
    setSending(true)
    try {
      const res = await fetch('/api/messages/send', { method: 'POST', headers: { ...tokenHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ to, message }) })
      if (!res.ok) throw new Error('Gagal mengirim pesan')
      setMessageText(''); await loadMessages()
    } finally { setSending(false) }
  }

  return (
    <div class={lightMode() ? 'wagate-light h-screen overflow-hidden bg-[#f0f2f5] text-[#111b21]' : 'h-screen overflow-hidden bg-[#111b21] text-[#e9edef]'}>
      <style>{`.wagate-light .bg-\\[\\#0b141a\\], .wagate-light .bg-\\[\\#111b21\\], .wagate-light .bg-\\[\\#202c33\\] { background-color: #ffffff !important; } .wagate-light main.bg-\\[\\#0b141a\\], .wagate-light .relative.flex-1 { background-color: #efeae2 !important; } .wagate-light .bg-\\[\\#2a3942\\] { background-color: #f0f2f5 !important; } .wagate-light .text-\\[\\#e9edef\\], .wagate-light p { color: #111b21 !important; } .wagate-light .text-\\[\\#8696a0\\], .wagate-light .text-\\[\\#aebac1\\], .wagate-light span { color: #667781 !important; } .wagate-light .border-\\[\\#313d45\\], .wagate-light .border-\\[\\#222e35\\] { border-color: #e9edef !important; } .wagate-light .bg-\\[\\#005c4b\\] { background-color: #d9fdd3 !important; color: #111b21 !important; } .wagate-light .shadow-2xl, .wagate-light .shadow { box-shadow: none !important; }`}</style>
      <div class="absolute inset-0 bg-[linear-gradient(180deg,#00a884_0_15%,#111b21_15%_100%)]" />
      <div class="relative mx-auto flex h-screen max-w-[1600px] overflow-hidden bg-[#0b141a] shadow-2xl md:h-[calc(100vh-32px)] md:translate-y-4 md:rounded-sm">
        <aside class={`${selectedContact() ? 'hidden md:flex' : 'flex'} w-full max-w-[420px] flex-col border-r border-[#313d45] bg-[#111b21] md:flex md:w-[38%] lg:w-[32%]`}>
          <div class="flex h-[60px] items-center justify-between bg-[#202c33] px-4">
            <div class="flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] font-semibold text-[#06251d]">WA</div><div><p class="text-sm font-semibold">WA Gate Inbox</p><p class="text-xs text-[#8696a0]">Primary runtime monitor</p></div></div>
            <div class="flex items-center gap-1"><button type="button" onClick={() => applyTheme(lightMode() ? 'dark' : 'light')} class="rounded-full p-2 text-[#aebac1] hover:bg-[#2a3942]" title="Toggle tema">{lightMode() ? '🌙' : '☀️'}</button><a href="/dashboard" class="rounded-full p-2 text-[#aebac1] hover:bg-[#2a3942]" title="Dashboard"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg></a></div>
          </div>
          <div class="border-b border-[#222e35] bg-[#111b21] p-2"><div class="flex items-center gap-2 rounded-lg bg-[#202c33] px-3 py-2 text-[#8696a0]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg><input value={search()} onInput={(event) => setSearch(event.currentTarget.value)} placeholder="Cari atau mulai chat baru" class="w-full bg-transparent text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]" /></div></div>
          <div class="flex-1 overflow-y-auto"><Show when={!loadingContacts()} fallback={<ContactSkeleton />}><For each={filteredContacts()} fallback={<EmptyContacts />}>{(contact) => (<button type="button" onClick={() => chooseContact(contact.phoneNumber)} class={`flex w-full items-center gap-3 border-b border-[#222e35] px-3 py-3 text-left hover:bg-[#202c33] ${selectedContact() === contact.phoneNumber ? 'bg-[#2a3942]' : ''}`}><div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6a7175] text-sm font-semibold text-white">{initials(contact.name ?? contact.phoneNumber)}</div><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-3"><p class="truncate text-[15px] text-[#e9edef]">{contact.name ?? contact.phoneNumber}</p><span class="shrink-0 text-xs text-[#8696a0]">{formatTime(contact.lastMessageAt)}</span></div><p class="truncate text-sm text-[#8696a0]">{contact.phoneNumber}</p></div></button>)}</For></Show></div>
        </aside>
        <main class={`${selectedContact() ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#0b141a]`}><Show when={selectedContact()} fallback={<NoChatSelected />}><div class="flex h-[60px] items-center justify-between bg-[#202c33] px-3 md:px-4"><div class="flex min-w-0 items-center gap-2 md:gap-3"><button type="button" onClick={() => setSelectedContact(null)} class="rounded-full p-2 text-[#aebac1] hover:bg-[#2a3942] md:hidden" title="Kembali ke daftar chat">←</button><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6a7175] text-sm font-semibold">{initials(displayName(activeContact(), selectedContact()))}</div><div><p class="text-sm font-semibold">{displayName(activeContact(), selectedContact())}</p><p class="text-xs text-[#8696a0]">online via WA Gate Runtime</p></div></div></div><div class="relative flex-1 overflow-y-auto bg-[#0b141a] p-6"><div class="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,#e9edef_1px,transparent_0)] [background-size:22px_22px]" /><div class="relative mx-auto flex max-w-4xl flex-col gap-2"><Show when={!loadingMessages()} fallback={<MessageSkeleton />}><For each={messages()}>{(msg) => (<div class={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div class={`max-w-[72%] rounded-lg px-3 py-2 text-[14px] leading-relaxed shadow ${msg.direction === 'outbound' ? 'bg-[#005c4b] text-[#e9edef]' : 'bg-[#202c33] text-[#e9edef]'}`}><p class="whitespace-pre-wrap">{msg.content}</p><div class="mt-1 flex items-center justify-end gap-1 text-xs text-[#aebac1]"><span>{formatTime(msg.createdAt)}</span><Show when={msg.direction === 'outbound'}><span class="text-[#53bdeb]">✓✓</span></Show></div></div></div>)}</For></Show></div></div><div class="flex min-h-[62px] items-center gap-3 bg-[#202c33] px-4 py-3"><input value={messageText()} onInput={(event) => setMessageText(event.currentTarget.value)} onKeyDown={(event) => event.key === 'Enter' && handleSend()} placeholder="Ketik pesan" class="min-h-11 flex-1 rounded-lg bg-[#2a3942] px-4 text-[15px] text-[#e9edef] outline-none placeholder:text-[#8696a0]" /><button type="button" onClick={handleSend} disabled={!messageText().trim() || sending()} class="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-[#06251d] disabled:bg-[#3b4a54] disabled:text-[#8696a0]" title="Kirim" aria-label="Kirim pesan"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg></button></div></Show></main>
      </div>
    </div>
  )
}
function ContactSkeleton() { return <div class="p-3"><For each={Array.from({ length: 8 })}>{() => <div class="mb-3 h-14 animate-pulse rounded-xl bg-[#202c33]" />}</For></div> }
function MessageSkeleton() { return <div class="flex flex-col gap-3"><For each={Array.from({ length: 6 })}>{(_, index) => <div class={`h-12 w-64 animate-pulse rounded-lg bg-[#202c33] ${index() % 2 ? 'self-end' : 'self-start'}`} />}</For></div> }
function EmptyContacts() { return <div class="p-6 text-center text-sm text-[#8696a0]">Belum ada percakapan masuk.</div> }
function NoChatSelected() { return <div class="flex flex-1 items-center justify-center border-b-4 border-[#00a884] bg-[#222e35] text-center"><div class="max-w-md px-8"><div class="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#0b141a] text-[#00a884]"><svg class="h-14 w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></div><h1 class="text-3xl font-light text-[#e9edef]">WA Gate Web</h1><p class="mt-3 text-sm leading-6 text-[#8696a0]">Pilih percakapan di kiri untuk membaca dan mengirim pesan melalui nomor WhatsApp yang tertaut.</p></div></div> }
