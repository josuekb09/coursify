import Avatar from "@/components/avatar"
import {
  EmojiPicker,
  FileAttachment,
  ImageAttachment,
  ImageLightbox,
  StatusTicks,
  VoiceNote,
  formatClock,
  formatDayDivider,
  formatListTime,
  isImageAttachment,
  isVoiceNote,
  messageStatus,
  sameDay,
} from "@/components/chat/chat-parts"
import Icons from "@/components/icons"
import { MAX_FILE_BYTES } from "@/data"
import { useApp } from "@/store"
import type { ChatAttachment, ChatMessage, Educator } from "@/types"
import { educatorMatchesQuery, formatBytes, formatEducatorActivity, isEducatorOnline } from "@/utils"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react"

const VOICE_LIMIT_SECONDS = 180
// Consecutive messages from one sender within this window share a bubble group.
const GROUP_WINDOW_MS = 5 * 60_000
const TYPING_FRESH_MS = 6_000

type StagedAttachment = {
  file: File
  previewUrl?: string
  progress: number
  ready?: ChatAttachment
  controller: AbortController
}

export default function MessagesView({
  peerId,
  query,
  onAuthor,
}: {
  peerId: string | null
  query: string
  onAuthor: (id: string) => void
}) {
  const {
    currentUser,
    educators,
    conversations,
    sendMessage,
    uploadChatAttachment,
    markConversationRead,
    signalTyping,
    conversationWith,
    messagesFor,
    unreadIn,
    educatorById,
    notify,
  } = useApp()

  const [activePeer, setActivePeer] = useState<string | null>(peerId)
  const [search, setSearch] = useState("")
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    if (peerId) setActivePeer(peerId)
  }, [peerId])

  const me = currentUser?.id ?? ""
  const needle = (search || query).trim().toLowerCase()

  const rows = useMemo(() => {
    return [...conversations]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .map((conversation) => {
        const otherId = conversation.participantIds.find((id) => id !== me) ?? ""
        const other = educatorById(otherId)
        const last = messagesFor(conversation.id).at(-1)
        return { conversation, other, last }
      })
      .filter((row): row is typeof row & { other: Educator } => Boolean(row.other))
      .filter(({ other, last, conversation }) => {
        if (!needle) return true
        const preview = (last?.body ?? conversation.lastMessage ?? "").toLowerCase()
        return educatorMatchesQuery(other, needle) || preview.includes(needle)
      })
  }, [conversations, educatorById, me, messagesFor, needle])

  const colleagues = useMemo(() => {
    const pool = educators.filter((educator) => educator.id !== me)
    const filtered = search.trim() ? pool.filter((educator) => educatorMatchesQuery(educator, search)) : pool
    return filtered.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 60)
  }, [educators, me, search])

  const peer = activePeer ? educatorById(activePeer) : undefined
  const { ref: mainRef, height } = useViewportFill<HTMLElement>()

  return (
    <main ref={mainRef} style={{ height }} className="flex min-h-[420px] min-w-0 flex-1 flex-col lg:p-6">
      <div className="flex min-h-0 flex-1 overflow-hidden bg-surface lg:rounded-2xl lg:border lg:border-line lg:shadow-[0_1px_2px_rgba(18,20,28,0.04),0_12px_40px_rgba(18,20,28,0.05)]">
        {/* ── Conversation list ── */}
        <aside
          className={`min-h-0 w-full flex-col border-line lg:flex lg:w-[340px] lg:shrink-0 lg:border-r ${
            peer ? "hidden" : "flex"
          }`}
        >
          <div className="px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">
                {composing ? "New message" : "Messages"}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setComposing((value) => !value)
                  setSearch("")
                }}
                className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
                  composing ? "bg-navy text-white" : "bg-navy-soft text-navy hover:bg-navy hover:text-white"
                }`}
                aria-label={composing ? "Back to conversations" : "Start a new conversation"}
                title={composing ? "Back" : "New message"}
              >
                {composing ? <Icons.Close className="h-4 w-4" /> : <Icons.Pencil className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative mt-3">
              <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={composing ? "Search colleagues by name, school or subject" : "Search messages"}
                className="h-10 w-full rounded-xl bg-canvas pl-9 pr-9 text-[14px] text-ink outline-none transition-shadow placeholder:text-muted focus:shadow-[0_0_0_3px_rgba(26,43,74,0.10)]"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
                  aria-label="Clear search"
                >
                  <Icons.Close className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            {composing ? (
              colleagues.length > 0 ? (
                colleagues.map((educator) => (
                  <button
                    type="button"
                    key={educator.id}
                    onClick={() => {
                      setActivePeer(educator.id)
                      setComposing(false)
                      setSearch("")
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-canvas"
                  >
                    <PresenceAvatar educator={educator} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-ink">
                        <span className="truncate">{educator.name}</span>
                        {educator.verified ? <Icons.VerifiedSeal className="h-3.5 w-3.5 shrink-0" /> : null}
                      </span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {[educator.subject, educator.school].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <EmptyList title="No colleagues found" body="Try a different name, school or subject." />
              )
            ) : rows.length > 0 ? (
              rows.map(({ conversation, other, last }) => {
                const unread = unreadIn(conversation.id)
                const selected = activePeer === other.id
                const lastMine = last?.senderId === me
                const peerTyping = isTyping(conversation.typingAt[other.id], last)
                return (
                  <button
                    type="button"
                    key={conversation.id}
                    onClick={() => setActivePeer(other.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                      selected ? "bg-navy-soft" : "hover:bg-canvas"
                    }`}
                  >
                    <PresenceAvatar educator={other} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className={`truncate text-[14.5px] text-ink ${unread ? "font-bold" : "font-semibold"}`}>
                            {other.name}
                          </span>
                          {other.verified ? <Icons.VerifiedSeal className="h-3.5 w-3.5 shrink-0" /> : null}
                        </span>
                        <span className={`shrink-0 text-[11.5px] ${unread ? "font-semibold text-navy" : "text-muted"}`}>
                          {formatListTime(last?.createdAt ?? conversation.updatedAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={`flex min-w-0 items-center gap-1 text-[13px] ${
                            unread ? "font-medium text-ink" : "text-muted"
                          }`}
                        >
                          {peerTyping ? (
                            <span className="font-medium text-online">typing…</span>
                          ) : (
                            <>
                              {lastMine && last ? (
                                <StatusTicks
                                  status={messageStatus(last, other.id, conversation, other.lastActiveAt)}
                                />
                              ) : null}
                              {last && isVoiceNote(last) ? <Icons.Mic className="h-3.5 w-3.5 shrink-0" /> : null}
                              {last && isImageAttachment(last) ? <Icons.Photo className="h-3.5 w-3.5 shrink-0" /> : null}
                              <span className="truncate">
                                {last ? previewText(last) : (conversation.lastMessage ?? "Say hello")}
                              </span>
                            </>
                          )}
                        </span>
                        {unread > 0 ? (
                          <span className="animate-pop-in grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-navy px-1.5 text-[11px] font-bold text-white">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                )
              })
            ) : needle ? (
              <EmptyList title="No matches" body={`Nothing in your messages matches “${search || query}”.`} />
            ) : (
              <EmptyList
                title="No conversations yet"
                body="Start one with a colleague. Plan a lesson together, swap a worksheet or just say hello."
                action={
                  <button
                    type="button"
                    onClick={() => setComposing(true)}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-hover"
                  >
                    <Icons.Pencil className="h-4 w-4" />
                    New message
                  </button>
                }
              />
            )}
          </div>
        </aside>

        {/* ── Thread ── */}
        <section className={`min-h-0 min-w-0 flex-1 flex-col ${peer ? "flex" : "hidden lg:flex"}`}>
          {peer && currentUser ? (
            <Thread
              key={peer.id}
              me={currentUser.id}
              peer={peer}
              conversation={conversationWith(peer.id)}
              messages={(() => {
                const conversation = conversationWith(peer.id)
                return conversation ? messagesFor(conversation.id) : []
              })()}
              onBack={() => setActivePeer(null)}
              onAuthor={onAuthor}
              sendMessage={sendMessage}
              uploadChatAttachment={uploadChatAttachment}
              markConversationRead={markConversationRead}
              signalTyping={signalTyping}
              notify={notify}
            />
          ) : (
            <div className="grid flex-1 place-items-center bg-canvas/60 p-8 text-center">
              <div className="max-w-xs">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface text-navy shadow-[0_1px_2px_rgba(18,20,28,0.06)]">
                  <Icons.Message className="h-7 w-7" />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-ink">Your messages</h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                  Pick a conversation, or start a new one with a colleague.
                </p>
                <button
                  type="button"
                  onClick={() => setComposing(true)}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-hover"
                >
                  <Icons.Pencil className="h-4 w-4" />
                  New message
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

/**
 * Sizes the chat to exactly fill the viewport below whatever sits above it (header, mobile
 * search row, banners), so the composer is always on screen without scrolling the page.
 */
function useViewportFill<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [top, setTop] = useState(64)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const scrolled = document.body.scrollTop + document.documentElement.scrollTop
      setTop(Math.max(0, Math.round(el.getBoundingClientRect().top + scrolled)))
    }
    measure()
    window.addEventListener("resize", measure)
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    const parent = ref.current?.parentElement
    if (observer) {
      observer.observe(document.body)
      if (parent?.previousElementSibling) observer.observe(parent.previousElementSibling)
    }
    return () => {
      window.removeEventListener("resize", measure)
      observer?.disconnect()
    }
  }, [])
  return { ref, height: `calc(100dvh - ${top}px)` }
}

function previewText(message: ChatMessage) {
  if (isVoiceNote(message)) return "Voice note"
  if (isImageAttachment(message) && message.body.startsWith("Shared ")) return "Photo"
  return message.body
}

function isTyping(typingAt: string | undefined, last: ChatMessage | undefined) {
  if (!typingAt) return false
  if (Date.now() - new Date(typingAt).getTime() > TYPING_FRESH_MS) return false
  return !last || typingAt > last.createdAt
}

function PresenceAvatar({ educator, size }: { educator: Educator; size: number }) {
  const online = isEducatorOnline(educator.lastActiveAt)
  return (
    <span className="relative shrink-0">
      <Avatar educator={educator} size={size} rounded="rounded-full" />
      {online ? (
        <span
          className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2.5px] border-surface bg-online"
          title="Active now"
        />
      ) : null}
    </span>
  )
}

function EmptyList({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[16rem] text-[13px] leading-relaxed text-muted">{body}</p>
      {action}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────────── */

type ThreadProps = {
  me: string
  peer: Educator
  conversation: ReturnType<ReturnType<typeof useApp>["conversationWith"]>
  messages: ChatMessage[]
  onBack: () => void
  onAuthor: (id: string) => void
  sendMessage: ReturnType<typeof useApp>["sendMessage"]
  uploadChatAttachment: ReturnType<typeof useApp>["uploadChatAttachment"]
  markConversationRead: ReturnType<typeof useApp>["markConversationRead"]
  signalTyping: ReturnType<typeof useApp>["signalTyping"]
  notify: (message: string) => void
}

function Thread({
  me,
  peer,
  conversation,
  messages,
  onBack,
  onAuthor,
  sendMessage,
  uploadChatAttachment,
  markConversationRead,
  signalTyping,
  notify,
}: ThreadProps) {
  const [draft, setDraft] = useState("")
  const [staged, setStaged] = useState<StagedAttachment | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)
  const [newBelow, setNewBelow] = useState(0)
  const [, forceTick] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Messages present when the thread opened render without an entrance animation.
  const initialIds = useRef<Set<string>>(new Set(messages.map((message) => message.id)))
  const lastCountRef = useRef(messages.length)

  const activity = formatEducatorActivity(peer.lastActiveAt)
  const peerTyping = conversation ? isTyping(conversation.typingAt[peer.id], messages.at(-1)) : false
  const founder = Boolean(peer.founder)

  // Re-render every few seconds so "typing…" and presence labels expire on their own.
  useEffect(() => {
    const timer = window.setInterval(() => forceTick((value) => value + 1), 3_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (conversation) markConversationRead(conversation.id)
  }, [conversation, markConversationRead, messages.length])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const added = messages.length - lastCountRef.current
    lastCountRef.current = messages.length
    if (added <= 0) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    const mineLast = messages.at(-1)?.senderId === me
    if (nearBottom || mineLast) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      setNewBelow(0)
    } else {
      setNewBelow((value) => value + added)
    }
  }, [me, messages])

  useEffect(() => {
    if (!peerTyping) return
    const el = scrollRef.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    }
  }, [peerTyping])

  useEffect(() => {
    return () => {
      if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl)
    }
  }, [staged?.previewUrl])

  const resizeComposer = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [])

  async function handleSend(event?: FormEvent) {
    event?.preventDefault()
    const attachment = staged?.ready
    if (staged && !attachment) return
    if (!draft.trim() && !attachment) return
    const body = draft
    setDraft("")
    setStaged(null)
    setEmojiOpen(false)
    setError(null)
    requestAnimationFrame(resizeComposer)
    const result = await sendMessage(peer.id, body, attachment)
    if (result) {
      setError(result)
      setDraft(body)
    }
    textareaRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void handleSend()
    }
  }

  async function stageFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError(`Attachments must be ${Math.round(MAX_FILE_BYTES / 1_048_576)} MB or smaller.`)
      return
    }
    const controller = new AbortController()
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
    setError(null)
    setStaged({ file, previewUrl, progress: 0, controller })
    try {
      const ready = await uploadChatAttachment(file, {
        signal: controller.signal,
        onProgress: (progress) =>
          setStaged((current) => (current?.controller === controller ? { ...current, progress } : current)),
      })
      setStaged((current) => (current?.controller === controller ? { ...current, progress: 100, ready } : current))
      textareaRef.current?.focus()
    } catch (err) {
      setStaged((current) => (current?.controller === controller ? null : current))
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : "Could not attach that file.")
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) void stageFile(file)
  }

  const groups = useMemo(() => groupMessages(messages), [messages])
  const lastMine = [...messages].reverse().find((message) => message.senderId === me)

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface/95 px-2 backdrop-blur sm:px-4">
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink hover:bg-canvas lg:hidden"
          aria-label="Back to conversations"
          onClick={onBack}
        >
          <Icons.ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onAuthor(peer.id)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left"
          title="View profile"
        >
          <PresenceAvatar educator={peer} size={40} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold text-ink">{peer.name}</span>
              {peer.verified || founder ? <Icons.VerifiedSeal className="h-3.5 w-3.5 shrink-0" /> : null}
              {founder ? (
                <span className="rounded-full bg-navy-soft px-1.5 text-[10px] font-semibold text-navy">Founder</span>
              ) : null}
            </span>
            <span
              key={peerTyping ? "typing" : activity.label}
              className={`animate-fade-in block truncate text-[12.5px] ${
                peerTyping || activity.isOnline ? "text-online" : "text-muted"
              }`}
            >
              {peerTyping ? "typing…" : activity.isOnline ? "Online" : activity.label}
              {!peerTyping && peer.school ? <span className="text-muted"> · {peer.school}</span> : null}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onAuthor(peer.id)}
          className="hidden h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-line-strong sm:inline-flex"
        >
          View profile
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const el = event.currentTarget
            if (newBelow && el.scrollHeight - el.scrollTop - el.clientHeight < 80) setNewBelow(0)
          }}
          className="h-full overflow-y-auto overscroll-contain bg-canvas/70 px-3 py-4 sm:px-6"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center pb-10 text-center">
              <Avatar educator={peer} size={72} rounded="rounded-full" />
              <p className="mt-3 font-display text-lg font-bold text-ink">{peer.name}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {[peer.subject, peer.school].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
                Say hello. Share a worksheet or plan next term's assessments together.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col">
              {groups.map((group, groupIndex) => {
                const mine = group.senderId === me
                const showDay = groupIndex === 0 || !sameDay(groups[groupIndex - 1].messages[0].createdAt, group.messages[0].createdAt)
                return (
                  <div key={group.messages[0].id}>
                    {showDay ? (
                      <div className="sticky top-0 z-10 flex justify-center py-2">
                        <span className="rounded-full bg-surface/90 px-3 py-1 text-[11.5px] font-medium text-muted shadow-[0_1px_2px_rgba(18,20,28,0.08)] backdrop-blur">
                          {formatDayDivider(group.messages[0].createdAt)}
                        </span>
                      </div>
                    ) : null}
                    <div className={`mt-2 flex flex-col gap-[3px] ${mine ? "items-end" : "items-start"}`}>
                      {group.messages.map((message, index) => {
                        const last = index === group.messages.length - 1
                        const status = mine ? messageStatus(message, peer.id, conversation, peer.lastActiveAt) : null
                        return (
                          <Bubble
                            key={message.id}
                            message={message}
                            mine={mine}
                            first={index === 0}
                            animate={!initialIds.current.has(message.id)}
                            status={status}
                            showMeta={last || status === "sending"}
                            showReceiptLabel={mine && message.id === lastMine?.id}
                            onImage={(url, name) => setLightbox({ url, name })}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {peerTyping ? <TypingBubble /> : null}
            </div>
          )}
        </div>

        {newBelow > 0 ? (
          <button
            type="button"
            onClick={() => {
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
              setNewBelow(0)
            }}
            className="animate-pop-in absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_8px_24px_rgba(18,20,28,0.2)]"
          >
            <Icons.Chevron className="h-4 w-4" />
            {newBelow} new {newBelow === 1 ? "message" : "messages"}
          </button>
        ) : null}
      </div>

      <div className="relative shrink-0 border-t border-line bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-3 sm:pt-3">
        {emojiOpen ? (
          <EmojiPicker
            onClose={() => setEmojiOpen(false)}
            onPick={(emoji) => {
              const el = textareaRef.current
              const start = el?.selectionStart ?? draft.length
              const end = el?.selectionEnd ?? draft.length
              setDraft((value) => value.slice(0, start) + emoji + value.slice(end))
              requestAnimationFrame(() => {
                el?.focus()
                el?.setSelectionRange(start + emoji.length, start + emoji.length)
              })
            }}
          />
        ) : null}

        {staged ? (
          <StagedCard
            staged={staged}
            onRemove={() => {
              staged.controller.abort()
              setStaged(null)
            }}
          />
        ) : null}

        {error ? (
          <p role="alert" className="animate-fade-in mb-2 flex items-start gap-2 rounded-xl bg-[#fbeeec] px-3 py-2 text-[12.5px] text-[#8a3b32]">
            <Icons.Alert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0">
              <Icons.Close className="h-3.5 w-3.5" />
            </button>
          </p>
        ) : null}

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />

        <Composer
          draft={draft}
          canSend={Boolean(draft.trim() || staged?.ready)}
          busy={Boolean(staged && !staged.ready)}
          emojiOpen={emojiOpen}
          textareaRef={textareaRef}
          onDraft={(value) => {
            setDraft(value)
            resizeComposer()
            if (value.trim()) signalTyping(peer.id)
          }}
          onKeyDown={handleKeyDown}
          onEmoji={() => setEmojiOpen((value) => !value)}
          onAttach={() => fileInputRef.current?.click()}
          onSend={() => void handleSend()}
          onVoiceNote={async (file) => {
            try {
              const attachment = await uploadChatAttachment(file)
              const result = await sendMessage(peer.id, "", attachment)
              if (result) setError(result)
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not send the voice note.")
            }
          }}
          notify={notify}
        />
      </div>

      {lightbox ? <ImageLightbox url={lightbox.url} name={lightbox.name} onClose={() => setLightbox(null)} /> : null}
    </>
  )
}

function groupMessages(messages: ChatMessage[]) {
  const groups: { senderId: string; messages: ChatMessage[] }[] = []
  for (const message of messages) {
    const current = groups.at(-1)
    const previous = current?.messages.at(-1)
    if (
      current &&
      previous &&
      current.senderId === message.senderId &&
      sameDay(previous.createdAt, message.createdAt) &&
      new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_WINDOW_MS
    ) {
      current.messages.push(message)
    } else {
      groups.push({ senderId: message.senderId, messages: [message] })
    }
  }
  return groups
}

function Bubble({
  message,
  mine,
  first,
  animate,
  status,
  showMeta,
  showReceiptLabel,
  onImage,
}: {
  message: ChatMessage
  mine: boolean
  first: boolean
  animate: boolean
  status: ReturnType<typeof messageStatus> | null
  showMeta: boolean
  showReceiptLabel: boolean
  onImage: (url: string, name: string) => void
}) {
  const voice = message.attachmentUrl && isVoiceNote(message)
  const image = message.attachmentUrl && !voice && isImageAttachment(message)
  const file = message.attachmentUrl && !voice && !image
  // Attachment-only messages carry an auto-generated "Shared <name>" body; don't repeat it.
  const autoBody = Boolean(message.attachmentUrl && message.body === `Shared ${message.attachmentName}`)
  const text = autoBody ? "" : message.body
  const mediaOnly = Boolean(image && !text)

  // Grouped bubbles tuck their inner corners together; only the first keeps a full top corner.
  const radius = mine
    ? `rounded-[20px] rounded-br-[6px] ${first ? "" : "rounded-tr-[6px]"}`
    : `rounded-[20px] rounded-bl-[6px] ${first ? "" : "rounded-tl-[6px]"}`

  const meta = (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] tabular-nums ${
        mediaOnly ? "rounded-full bg-black/45 px-1.5 py-0.5 text-white" : mine ? "text-white/65" : "text-muted"
      }`}
    >
      {formatClock(message.createdAt)}
      {status ? <StatusTicks status={status} onDark={mine || mediaOnly} /> : null}
    </span>
  )

  return (
    <div
      className={`group flex max-w-[82%] flex-col sm:max-w-[68%] ${mine ? "items-end" : "items-start"} ${
        animate ? `animate-message-in ${mine ? "origin-bottom-right" : "origin-bottom-left"}` : ""
      } ${message.pending ? "opacity-80" : ""} transition-opacity duration-300`}
      title={new Date(message.createdAt).toLocaleString("en-ZA")}
    >
      <div
        className={`relative ${radius} ${mediaOnly ? "p-1" : voice || file ? "p-1.5" : "px-3.5 py-2"} ${
          mine ? "bg-navy text-white" : "bg-surface text-ink shadow-[0_1px_1px_rgba(18,20,28,0.06)]"
        }`}
      >
        {voice ? (
          <div className="px-1 pt-0.5">
            <VoiceNote url={message.attachmentUrl!} name={message.attachmentName} seed={message.id} mine={mine} />
          </div>
        ) : null}
        {image ? (
          <div className="relative">
            <ImageAttachment
              url={message.attachmentUrl!}
              name={message.attachmentName ?? "Photo"}
              onOpen={() => onImage(message.attachmentUrl!, message.attachmentName ?? "Photo")}
            />
            {mediaOnly && showMeta ? <span className="absolute bottom-1.5 right-1.5">{meta}</span> : null}
          </div>
        ) : null}
        {file ? (
          <FileAttachment
            url={message.attachmentUrl!}
            name={message.attachmentName ?? "Attachment"}
            size={message.attachmentSize}
            mine={mine}
          />
        ) : null}
        {text ? (
          <p
            className={`whitespace-pre-wrap break-words text-[14.5px] leading-[1.45] ${
              image || file || voice ? "px-2 pb-0.5 pt-1.5" : ""
            }`}
          >
            {text}
            {/* Invisible spacer keeps the last line clear of the floating timestamp. */}
            {showMeta ? <span className="inline-block w-[4.2rem]" aria-hidden="true" /> : null}
          </p>
        ) : null}
        {showMeta && !mediaOnly ? (
          <span className={`${text ? "absolute bottom-1.5 right-3" : "flex justify-end px-2 pb-0.5"}`}>{meta}</span>
        ) : null}
      </div>
      {showReceiptLabel && status === "read" ? (
        <span className="animate-fade-in mt-1 pr-1 text-[11px] text-muted">Seen</span>
      ) : null}
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="animate-message-in mt-2 flex origin-bottom-left">
      <div className="flex items-center gap-1 rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3 shadow-[0_1px_1px_rgba(18,20,28,0.06)]">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/70"
            style={{ animationDelay: `${dot * 140}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  )
}

function StagedCard({ staged, onRemove }: { staged: StagedAttachment; onRemove: () => void }) {
  const uploading = !staged.ready
  return (
    <div className="animate-message-in mb-2 flex items-center gap-3 rounded-2xl border border-line bg-canvas p-2 pr-3">
      {staged.previewUrl ? (
        <img src={staged.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface text-navy">
          <Icons.File className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{staged.file.name}</p>
        {uploading ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-navy transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(4, staged.progress)}%` }}
              />
            </span>
            <span className="font-mono text-[11px] text-muted">{staged.progress}%</span>
          </div>
        ) : (
          <p className="text-[12px] text-muted">{formatBytes(staged.file.size)} · ready to send</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink"
        aria-label={uploading ? "Cancel upload" : "Remove attachment"}
      >
        <Icons.Close className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── Composer + voice recorder ──────────────────────────────────────────────────────── */

function Composer({
  draft,
  canSend,
  busy,
  emojiOpen,
  textareaRef,
  onDraft,
  onKeyDown,
  onEmoji,
  onAttach,
  onSend,
  onVoiceNote,
  notify,
}: {
  draft: string
  canSend: boolean
  busy: boolean
  emojiOpen: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onDraft: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onEmoji: () => void
  onAttach: () => void
  onSend: () => void
  onVoiceNote: (file: File) => Promise<void>
  notify: (message: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sendingVoice, setSendingVoice] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const discardRef = useRef(false)

  const stopTracks = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopTracks(), [stopTracks])

  const finish = useCallback(
    (discard: boolean) => {
      const recorder = recorderRef.current
      if (!recorder) return
      discardRef.current = discard
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
      if (recorder.state !== "inactive") recorder.stop()
    },
    [],
  )

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      notify("Voice notes aren't supported in this browser.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      )
      let recorder: MediaRecorder
      try {
        recorder = new MediaRecorder(stream, { audioBitsPerSecond: 20_000, ...(mimeType ? { mimeType } : {}) })
      } catch {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        // Measured from the start time, not from React state, so the 3-minute auto-stop
        // (which fires inside the interval closure) still sees the real duration.
        const duration = Math.min(VOICE_LIMIT_SECONDS, Math.round((Date.now() - startedAtRef.current) / 1000))
        const discard = discardRef.current
        const chunks = chunksRef.current
        stopTracks()
        recorderRef.current = null
        setRecording(false)
        setSeconds(0)
        if (discard) return
        if (chunks.length === 0 || duration < 1) {
          notify("That voice note was too short.")
          return
        }
        const type = recorder.mimeType || "audio/webm"
        const ext = type.includes("mp4") ? "m4a" : "webm"
        const label = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`
        const file = new File(chunks, `Voice note (${label}).${ext}`, { type })
        setSendingVoice(true)
        void onVoiceNote(file).finally(() => setSendingVoice(false))
      }
      recorderRef.current = recorder
      discardRef.current = false
      startedAtRef.current = Date.now()
      recorder.start(250)
      setRecording(true)
      setSeconds(0)
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
        setSeconds(elapsed)
        if (elapsed >= VOICE_LIMIT_SECONDS) {
          notify("Voice notes can be up to 3 minutes. Sending it now.")
          finish(false)
        }
      }, 250)
    } catch {
      stopTracks()
      notify("Coursify needs microphone access to record a voice note.")
    }
  }

  if (recording) {
    return (
      <div className="animate-fade-in flex h-12 items-center gap-2">
        <button
          type="button"
          onClick={() => finish(true)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-[#8a3b32]"
          aria-label="Discard voice note"
          title="Discard"
        >
          <Icons.Trash className="h-5 w-5" />
        </button>
        <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full bg-canvas px-4">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d64545] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#d64545]" />
          </span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
          <span className="flex h-5 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
            {Array.from({ length: 28 }, (_, i) => (
              <span
                key={i}
                className="w-[3px] shrink-0 animate-pulse rounded-full bg-navy/45"
                style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 7) * 110}ms` }}
              />
            ))}
          </span>
          <span className="hidden text-[11px] text-muted sm:inline">max 3:00</span>
        </div>
        <button
          type="button"
          onClick={() => finish(false)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-white transition-transform hover:bg-navy-hover active:scale-95"
          aria-label="Send voice note"
          title="Send"
        >
          <Icons.Send className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSend()
      }}
      className="flex items-end gap-1.5"
    >
      <div className="flex min-h-11 min-w-0 flex-1 items-end rounded-[22px] bg-canvas pl-1 pr-1 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(26,43,74,0.10)]">
        <button
          type="button"
          onClick={onEmoji}
          className={`grid h-11 w-10 shrink-0 place-items-center rounded-full transition-colors ${
            emojiOpen ? "text-navy" : "text-muted hover:text-ink"
          }`}
          aria-label="Emoji"
          title="Emoji"
        >
          <Icons.Smile className="h-5 w-5" />
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={sendingVoice ? "Sending voice note…" : "Message"}
          className="max-h-[140px] min-w-0 flex-1 resize-none bg-transparent py-[11px] text-[15px] leading-[1.4] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={onAttach}
          disabled={busy}
          className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink disabled:opacity-40"
          aria-label="Attach a file"
          title="Attach a file"
        >
          <Icons.Paperclip className="h-5 w-5" />
        </button>
      </div>
      {canSend ? (
        <button
          type="submit"
          className="animate-pop-in grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-white transition-transform hover:bg-navy-hover active:scale-95"
          aria-label="Send"
        >
          <Icons.Send className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy || sendingVoice}
          className="animate-pop-in grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-white transition-transform hover:bg-navy-hover active:scale-95 disabled:opacity-50"
          aria-label="Record a voice note"
          title="Record a voice note"
        >
          <Icons.Mic className="h-5 w-5" />
        </button>
      )}
    </form>
  )
}
