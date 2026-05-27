import { createFileRoute, redirect } from '@tanstack/solid-router'
import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import type { JSX } from 'solid-js'

export const Route = createFileRoute('/inbox-live')({
  beforeLoad: () => { if (typeof window !== 'undefined' && !localStorage.getItem('wa-gate-token')) throw redirect({ to: '/login' }) },
  component: InboxLivePage,
})

type Contact = { id: string; phoneNumber: string; name: string | null; lastMessageAt: string | null; hasChatHistory: boolean }
type Message = { id: string; waMessageId: string; fromNumber: string; toNumber: string; messageType: string; content: string | null; direction: string; status: string; isFromBot: boolean; createdAt: string }

type ThemeMode = 'light' | 'dark'
type MessageAction = 'copy' | 'reply' | 'forward' | 'detail'
type FormattedSegment = { text: string; bold: boolean; italic: boolean; strike: boolean; code: boolean }

function tokenHeader(): HeadersInit { const token = typeof window === 'undefined' ? null : localStorage.getItem('wa-gate-token'); return token ? { Authorization: `Bearer ${token}` } : {} }
function withRealtimeNonce(url: string): string { return `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}` }
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(withRealtimeNonce(url), { headers: { ...tokenHeader(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!res.ok) throw new Error('Gagal memuat data')
  return res.json() as Promise<T>
}
function isLidNumber(value: string | null): boolean { return Boolean(value && /^\d{12,18}$/.test(value) && !value.startsWith('62')) }
function displayPhone(value: string | null): string { return isLidNumber(value) ? `ID WhatsApp ${value}` : value ?? '' }
function displayName(contact: Contact | undefined, phone: string | null): string { return contact?.name || displayPhone(contact?.phoneNumber ?? phone) || 'Pilih chat' }
function initials(value: string): string { return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'WA' }
function formatTime(value: string | null): string { if (!value) return ''; return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') }
function normalizeNewChatPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('8') ? `62${digits}` : digits
  return /^62\d{8,15}$/.test(normalized) ? normalized : null
}
function makePendingMessage(to: string, text: string): Message { return { id: `pending_${crypto.randomUUID()}`, waMessageId: `pending_${Date.now()}`, fromNumber: 'me', toNumber: to, messageType: 'text', content: text, direction: 'outbound', status: 'sending', isFromBot: false, createdAt: new Date().toISOString() } }
function isPendingMessage(message: Message): boolean { return message.id.startsWith('pending_') }
function messageKey(message: Message): string { return `${message.direction}:${message.toNumber}:${message.content ?? ''}` }
function mergeServerMessages(current: Message[], next: Message[]): Message[] {
  const serverKeys = new Set(next.map(messageKey))
  const pending = current.filter((message) => isPendingMessage(message) && !serverKeys.has(messageKey(message)))
  return [...next, ...pending]
}

function InboxLivePage() {
  const [selectedContact, setSelectedContact] = createSignal<string | null>(null)
  const [messageText, setMessageText] = createSignal('')
  const [search, setSearch] = createSignal('')
  const [newChatPhone, setNewChatPhone] = createSignal('')
  const [newChatError, setNewChatError] = createSignal<string | null>(null)
  const [contacts, setContacts] = createSignal<Contact[]>([])
  const [messages, setMessages] = createSignal<Message[]>([])
  const [loadingContacts, setLoadingContacts] = createSignal(true)
  const [loadingMessages, setLoadingMessages] = createSignal(false)
  const [sending, setSending] = createSignal(false)
  const [theme, setTheme] = createSignal<ThemeMode>('dark')
  const [replyTo, setReplyTo] = createSignal<Message | null>(null)
  const [menuMessage, setMenuMessage] = createSignal<string | null>(null)
  const [forwardMessage, setForwardMessage] = createSignal<Message | null>(null)
  const [toast, setToast] = createSignal<string | null>(null)

  const applyTheme = (mode: ThemeMode) => {
    setTheme(mode)
    localStorage.setItem('theme', mode)
    document.documentElement.classList.toggle('dark', mode === 'dark')
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
      const merged = mergeServerMessages(messages(), next)
      if (!sameMessages(merged)) setMessages(merged)
    } finally {
      if (showSkeleton) setLoadingMessages(false)
    }
  }

  const loadContacts = async () => {
    try {
      const data = await fetchJson<Contact[]>('/api/messages/contacts')
      setContacts(data)
      if (!selectedContact() && data[0]) {
        setSelectedContact(data[0].phoneNumber)
        await loadMessages(true)
      }
    } finally {
      setLoadingContacts(false)
    }
  }

  onMount(() => {
    applyTheme(localStorage.getItem('theme') === 'light' ? 'light' : 'dark')
    void loadContacts()
    const realtimeTick = () => { void loadContacts(); void loadMessages() }
    const realtimeTimer = window.setInterval(realtimeTick, 1000)
    const onVisible = () => { if (!document.hidden) realtimeTick() }
    document.addEventListener('visibilitychange', onVisible)
    onCleanup(() => { window.clearInterval(realtimeTimer); document.removeEventListener('visibilitychange', onVisible) })
  })

  const filteredContacts = createMemo(() => { const term = search().toLowerCase().trim(); return term ? contacts().filter((contact) => `${contact.name ?? ''} ${contact.phoneNumber}`.toLowerCase().includes(term)) : contacts() })
  const activeContact = createMemo(() => contacts().find((contact) => contact.phoneNumber === selectedContact()))
  const chooseContact = (phone: string) => { setSelectedContact(phone); void loadMessages(true) }
  const startNewChat = () => {
    const phone = normalizeNewChatPhone(newChatPhone())
    if (!phone) { setNewChatError('Nomor harus format 08..., 628..., +628..., 62 817-..., atau +62 817-...'); return }
    setNewChatError(null)
    setNewChatPhone('')
    setContacts((prev) => prev.some((contact) => contact.phoneNumber === phone) ? prev : [{ id: phone, phoneNumber: phone, name: null, lastMessageAt: null, hasChatHistory: false }, ...prev])
    setSelectedContact(phone)
    setMessages([])
    void loadMessages(true)
  }

  const handleSend = async () => {
    const to = selectedContact(), message = messageText().trim(); if (!to || !message || sending()) return
    const quoted = replyTo()
    const outgoingText = quoted ? `> ${quoted.content ?? ''}\n\n${message}` : message
    const optimistic = makePendingMessage(to, outgoingText)
    setMessageText('')
    setMessages((prev) => [...prev, optimistic])
    setSending(true)
    try {
      const res = await fetch(withRealtimeNonce('/api/messages/send'), { method: 'POST', headers: { ...tokenHeader(), 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }, cache: 'no-store', body: JSON.stringify({ to, message: outgoingText }) })
      if (!res.ok) throw new Error('Gagal mengirim pesan')
      const saved = await res.json() as Message
      setMessages((prev) => prev.map((item) => item.id === optimistic.id ? saved : item))
      setReplyTo(null)
      void loadContacts()
    } catch {
      setMessages((prev) => prev.map((item) => item.id === optimistic.id ? { ...item, status: 'failed' } : item))
    } finally { setSending(false) }
  }

  const showToast = (text: string) => { setToast(text); window.setTimeout(() => setToast(null), 2200) }
  const handleMessageAction = (message: Message, action: MessageAction) => {
    if (action === 'copy') { void navigator.clipboard?.writeText(message.content ?? ''); showToast('Pesan disalin'); setMenuMessage(null); return }
    if (action === 'reply') { setReplyTo(message); setMenuMessage(null); showToast('Mode balas aktif'); return }
    if (action === 'forward') { setForwardMessage(message); setMessageText(message.content ?? ''); setMenuMessage(null); showToast('Pesan siap diteruskan'); return }
    showToast(`${message.direction === 'outbound' ? 'Keluar' : 'Masuk'} - ${message.status} - ${formatTime(message.createdAt)}`); setMenuMessage(null)
  }
  const cancelReply = () => setReplyTo(null)
  const cancelForward = () => { setForwardMessage(null); setMessageText('') }

  const isLight = createMemo(() => theme() === 'light')

  return (
    <div class={isLight() ? 'h-dvh overflow-hidden bg-[#f0f2f5] text-[#111b21]' : 'h-dvh overflow-hidden bg-[#111b21] text-[#e9edef]'}>
      <div class="flex h-full w-full overflow-hidden">
        <aside class={`${selectedContact() ? 'hidden md:flex' : 'flex'} h-full w-full max-w-[480px] flex-col border-r md:flex md:w-[35%] lg:w-[30%] ${isLight() ? 'border-[#d1d7db] bg-white' : 'border-[#2a3942] bg-[#111b21]'}`}>
          <div class={`flex h-[59px] items-center justify-between px-4 ${isLight() ? 'bg-[#f0f2f5]' : 'bg-[#202c33]'}`}>
            <div class="flex items-center gap-3"><div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] font-bold text-[#06251d]">WA</div><div><p class="text-sm font-semibold">WA Gate</p><p class={isLight() ? 'text-xs text-[#667781]' : 'text-xs text-[#8696a0]'}>BPS Buton Selatan</p></div></div>
            <div class="flex items-center gap-1">
              <IconButton title="Toggle tema" onClick={() => applyTheme(isLight() ? 'dark' : 'light')}><ThemeIcon light={isLight()} /></IconButton>
              <a href="/dashboard" class={iconButtonClass(isLight())} title="Dashboard"><HomeIcon /></a>
            </div>
          </div>
          <div class={`space-y-2 p-2 ${isLight() ? 'bg-white' : 'bg-[#111b21]'}`}>
            <div class={`flex h-9 items-center gap-3 rounded-lg px-3 ${isLight() ? 'bg-[#f0f2f5] text-[#54656f]' : 'bg-[#202c33] text-[#8696a0]'}`}><SearchIcon /><input value={search()} onInput={(event) => setSearch(event.currentTarget.value)} placeholder="Cari percakapan" class={`w-full bg-transparent text-sm outline-none ${isLight() ? 'text-[#111b21] placeholder:text-[#667781]' : 'text-[#e9edef] placeholder:text-[#8696a0]'}`} /></div>
            <div class={`rounded-lg border p-2 ${isLight() ? 'border-[#e9edef] bg-[#f7f8fa]' : 'border-[#2a3942] bg-[#202c33]'}`}>
              <div class="flex items-center gap-2">
                <input value={newChatPhone()} onInput={(event) => { setNewChatPhone(event.currentTarget.value); setNewChatError(null) }} onKeyDown={(event) => { if (event.key === 'Enter') startNewChat() }} placeholder="Nomor baru: 08..., 628..., +628..., 62 817-..." class={`min-w-0 flex-1 bg-transparent text-sm outline-none ${isLight() ? 'text-[#111b21] placeholder:text-[#667781]' : 'text-[#e9edef] placeholder:text-[#8696a0]'}`} />
                <button type="button" onClick={startNewChat} class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#06cf9c]" title="Mulai chat baru"><NewChatIcon /></button>
              </div>
              <Show when={newChatError()}><p class="mt-1 text-xs text-red-500">{newChatError()}</p></Show>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto"><Show when={!loadingContacts()} fallback={<ContactSkeleton light={isLight()} />}><For each={filteredContacts()} fallback={<EmptyContacts light={isLight()} />}>{(contact) => (<button type="button" onClick={() => chooseContact(contact.phoneNumber)} class={`flex w-full items-center gap-3 border-b px-3 py-3 text-left ${isLight() ? 'border-[#f0f2f5] hover:bg-[#f5f6f6]' : 'border-[#222e35] hover:bg-[#202c33]'} ${selectedContact() === contact.phoneNumber ? (isLight() ? 'bg-[#f0f2f5]' : 'bg-[#2a3942]') : ''}`}><Avatar label={initials(contact.name ?? contact.phoneNumber)} /><div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-3"><p class={isLight() ? 'truncate text-[16px] text-[#111b21]' : 'truncate text-[16px] text-[#e9edef]'}>{contact.name ?? displayPhone(contact.phoneNumber)}</p><span class={isLight() ? 'shrink-0 text-xs text-[#667781]' : 'shrink-0 text-xs text-[#8696a0]'}>{formatTime(contact.lastMessageAt)}</span></div><p class={isLight() ? 'truncate text-sm text-[#667781]' : 'truncate text-sm text-[#8696a0]'}>{contact.phoneNumber}</p></div></button>)}</For></Show></div>
        </aside>
        <main class={`${selectedContact() ? 'flex' : 'hidden md:flex'} h-full min-w-0 flex-1 flex-col ${isLight() ? 'bg-[#efeae2]' : 'bg-[#0b141a]'}`}><Show when={selectedContact()} fallback={<NoChatSelected light={isLight()} />}><div class={`flex h-[59px] items-center justify-between px-3 md:px-4 ${isLight() ? 'bg-[#f0f2f5]' : 'bg-[#202c33]'}`}><div class="flex min-w-0 items-center gap-3"><IconButton title="Kembali" onClick={() => setSelectedContact(null)} mobileOnly><BackIcon /></IconButton><Avatar label={initials(displayName(activeContact(), selectedContact()))} /><div><p class="text-sm font-semibold">{displayName(activeContact(), selectedContact())}</p><p class={isLight() ? 'text-xs text-[#667781]' : 'text-xs text-[#8696a0]'}>WhatsApp</p></div></div><MoreIcon /></div><div class="relative flex-1 overflow-y-auto px-4 py-5 md:px-16"><div class="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,#111b21_1px,transparent_0)] [background-size:22px_22px]" /><div class="relative mx-auto flex max-w-5xl flex-col gap-1"><Show when={!loadingMessages()} fallback={<MessageSkeleton light={isLight()} />}><For each={messages()}>{(msg) => (<div class={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div class={`relative max-w-[82%] rounded-lg px-2.5 py-1.5 text-[14px] leading-relaxed shadow-sm md:max-w-[64%] ${msg.direction === 'outbound' ? (isLight() ? 'bg-[#d9fdd3] text-[#111b21]' : 'bg-[#005c4b] text-[#e9edef]') : (isLight() ? 'bg-white text-[#111b21]' : 'bg-[#202c33] text-[#e9edef]')}`}><div class="flex items-start gap-1"><WhatsAppText text={msg.content ?? ''} /><button type="button" onClick={() => setMenuMessage(menuMessage() === msg.id ? null : msg.id)} class={`ml-1 rounded px-1 text-xs opacity-70 hover:opacity-100 ${isLight() ? 'hover:bg-black/10' : 'hover:bg-white/10'}`} title="Menu pesan"><ChevronDownIcon /></button></div><MessageMenu open={menuMessage() === msg.id} message={msg} light={isLight()} onAction={handleMessageAction} /><div class={`mt-1 flex items-center justify-end gap-1 text-[11px] ${isLight() ? 'text-[#667781]' : 'text-[#aebac1]'}`}><span>{formatTime(msg.createdAt)}</span><Show when={msg.direction === 'outbound'}><StatusIcon status={msg.status} /></Show></div></div></div>)}</For></Show></div></div><Show when={replyTo()}>{(reply) => <ComposerPreview label="Balas pesan" text={reply().content ?? ''} light={isLight()} onClose={cancelReply} />}</Show><Show when={forwardMessage()}>{(forward) => <ComposerPreview label="Teruskan pesan" text={forward().content ?? ''} light={isLight()} onClose={cancelForward} />}</Show><div class={`flex min-h-[62px] items-center gap-2 px-3 py-2 ${isLight() ? 'bg-[#f0f2f5]' : 'bg-[#202c33]'}`}><button class={iconButtonClass(isLight())} type="button"><AttachIcon /></button><input value={messageText()} onInput={(event) => setMessageText(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleSend() }} placeholder="Ketik pesan" class={`h-11 flex-1 rounded-lg px-4 text-sm outline-none ${isLight() ? 'bg-white text-[#111b21] placeholder:text-[#667781]' : 'bg-[#2a3942] text-[#e9edef] placeholder:text-[#8696a0]'}`} /><button type="button" onClick={() => void handleSend()} disabled={sending() || !messageText().trim()} class="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-50"><SendIcon /></button></div></Show></main>
      </div>
      <Show when={toast()}><div class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">{toast()}</div></Show>
    </div>
  )
}
function iconButtonClass(light: boolean): string { return `flex h-10 w-10 items-center justify-center rounded-full ${light ? 'text-[#54656f] hover:bg-[#e9edef]' : 'text-[#aebac1] hover:bg-[#2a3942]'}` }
function IconButton(props: { title: string; onClick: () => void; children: JSX.Element; mobileOnly?: boolean }) { return <button type="button" onClick={props.onClick} class={`${iconButtonClass(false)} ${props.mobileOnly ? 'md:hidden' : ''}`} title={props.title}>{props.children}</button> }
function Avatar(props: { label: string }) { return <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6a7175] text-sm font-semibold text-white">{props.label}</div> }
function ContactSkeleton(props: { light: boolean }) { return <div class="p-3"><For each={Array.from({ length: 8 })}>{() => <div class={`mb-3 h-14 animate-pulse rounded-xl ${props.light ? 'bg-[#f0f2f5]' : 'bg-[#202c33]'}`} />}</For></div> }
function MessageSkeleton(props: { light: boolean }) { return <div class="flex flex-col gap-3"><For each={Array.from({ length: 6 })}>{(_, index) => <div class={`h-12 w-64 animate-pulse rounded-lg ${props.light ? 'bg-white' : 'bg-[#202c33]'} ${index() % 2 ? 'self-end' : 'self-start'}`} />}</For></div> }
function EmptyContacts(props: { light: boolean }) { return <div class={props.light ? 'p-6 text-center text-sm text-[#667781]' : 'p-6 text-center text-sm text-[#8696a0]'}>Belum ada percakapan masuk.</div> }
function NoChatSelected(props: { light: boolean }) { return <div class={`flex flex-1 items-center justify-center border-b-4 border-[#00a884] text-center ${props.light ? 'bg-[#f8f9fa]' : 'bg-[#222e35]'}`}><div class="max-w-md px-8"><div class={`mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full ${props.light ? 'bg-[#e9edef] text-[#54656f]' : 'bg-[#0b141a] text-[#00a884]'}`}><ChatIcon /></div><h1 class="text-3xl font-light">WA Gate Web</h1><p class={props.light ? 'mt-3 text-sm leading-6 text-[#667781]' : 'mt-3 text-sm leading-6 text-[#8696a0]'}>Pilih percakapan untuk membaca dan mengirim pesan.</p></div></div> }
function parseWhatsAppText(text: string): (FormattedSegment | { quote: string })[] {
  const parts: (FormattedSegment | { quote: string })[] = []
  for (const line of text.split('\n')) {
    if (line.startsWith('> ')) { parts.push({ quote: line.slice(2) }); continue }
    let rest = line
    const pattern = /(\*[^*]+\*|_[^_]+_|~[^~]+~|`[^`]+`)/
    while (rest) {
      const match = pattern.exec(rest)
      if (!match) { parts.push({ text: rest, bold: false, italic: false, strike: false, code: false }); break }
      if (match.index > 0) parts.push({ text: rest.slice(0, match.index), bold: false, italic: false, strike: false, code: false })
      const raw = match[0], marker = raw[0], inner = raw.slice(1, -1)
      parts.push({ text: inner, bold: marker === '*', italic: marker === '_', strike: marker === '~', code: marker === '`' })
      rest = rest.slice(match.index + raw.length)
    }
    parts.push({ text: '\n', bold: false, italic: false, strike: false, code: false })
  }
  return parts.slice(0, -1)
}
function WhatsAppText(props: { text: string }) { return <p class="whitespace-pre-wrap break-words">{parseWhatsAppText(props.text).map((part) => 'quote' in part ? <span class="my-1 block border-l-4 border-[#00a884] pl-2 italic opacity-80">{part.quote}</span> : <span class={`${part.bold ? 'font-bold' : ''} ${part.italic ? 'italic' : ''} ${part.strike ? 'line-through' : ''} ${part.code ? 'rounded bg-black/10 px-1 font-mono text-[13px]' : ''}`}>{part.text}</span>)}</p> }
function MessageMenu(props: { open: boolean; message: Message; light: boolean; onAction: (message: Message, action: MessageAction) => void }) { return <Show when={props.open}><div class={`absolute right-2 top-7 z-20 w-44 overflow-hidden rounded-lg py-1 text-sm shadow-xl ${props.light ? 'bg-white text-[#111b21]' : 'bg-[#233138] text-[#e9edef]'}`}><button class="block w-full px-3 py-2 text-left hover:bg-black/10" onClick={() => props.onAction(props.message, 'reply')}>Balas</button><button class="block w-full px-3 py-2 text-left hover:bg-black/10" onClick={() => props.onAction(props.message, 'copy')}>Salin</button><button class="block w-full px-3 py-2 text-left hover:bg-black/10" onClick={() => props.onAction(props.message, 'forward')}>Teruskan</button><button class="block w-full px-3 py-2 text-left hover:bg-black/10" onClick={() => props.onAction(props.message, 'detail')}>Info pesan</button></div></Show> }
function ComposerPreview(props: { label: string; text: string; light: boolean; onClose: () => void }) { return <div class={`px-3 pt-2 ${props.light ? 'bg-[#f0f2f5]' : 'bg-[#202c33]'}`}><div class={`flex items-center gap-3 rounded-lg border-l-4 border-[#00a884] p-2 ${props.light ? 'bg-white' : 'bg-[#111b21]'}`}><div class="min-w-0 flex-1"><p class="text-xs font-semibold text-[#00a884]">{props.label}</p><p class="truncate text-xs opacity-75">{props.text}</p></div><button type="button" onClick={props.onClose} class="text-lg opacity-70 hover:opacity-100">x</button></div></div> }
function SearchIcon() { return <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg> }
function HomeIcon() { return <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg> }
function ThemeIcon(props: { light: boolean }) { return props.light ? <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A8 8 0 1111.2 3 6.5 6.5 0 0021 12.8z"/></svg> : <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> }
function BackIcon() { return <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> }
function MoreIcon() { return <svg class="h-5 w-5 text-[#aebac1]" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg> }
function ChevronDownIcon() { return <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg> }
function AttachIcon() { return <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg> }
function SendIcon() { return <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg> }
function NewChatIcon() { return <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> }
function ChatIcon() { return <svg class="h-14 w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> }
function StatusIcon(props: { status: string }) { return props.status === 'failed' ? <svg class="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg> : <svg class="h-4 w-4 text-[#53bdeb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 13l4 4L15 7"/><path d="M9 17L23 3"/></svg> }
