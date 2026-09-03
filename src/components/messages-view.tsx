import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import { useApp } from "@/store"
import { formatWhen, educatorMatchesQuery } from "@/utils"
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"

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
    markConversationRead,
    messagesFor,
    unreadIn,
    educatorById,
    live,
  } = useApp()
  const [activePeer, setActivePeer] = useState<string | null>(peerId)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (peerId) setActivePeer(peerId)
  }, [peerId])

  const ordered = useMemo(() => {
    const list = [...conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    if (!query.trim()) return list
    return list.filter((conversation) => {
      const otherId = conversation.participantIds.find((id) => id !== currentUser?.id)
      const other = otherId ? educatorById(otherId) : undefined
      return other ? educatorMatchesQuery(other, query) : false
    })
  }, [conversations, currentUser?.id, educatorById, query])

  const peer = activePeer ? educatorById(activePeer) : undefined
  const conversationId = ordered.find((item) => item.participantIds.includes(activePeer ?? ""))?.id
  const thread = conversationId ? messagesFor(conversationId) : []

  useEffect(() => {
    if (conversationId && unreadIn(conversationId) > 0) markConversationRead(conversationId)
  }, [conversationId, markConversationRead, thread.length, unreadIn])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [thread.length, activePeer])

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    if (!activePeer) return
    const result = await sendMessage(activePeer, draft)
    if (result) {
      setError(result)
      return
    }
    setDraft("")
    setError(null)
  }

  const others = useMemo(() => {
    const pool = educators.filter((educator) => educator.id !== currentUser?.id)
    if (!query.trim()) return pool
    return pool.filter((educator) => educatorMatchesQuery(educator, query))
  }, [currentUser?.id, educators, query])

  return (
    <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em] text-ink">Messages</h1>
      <p className="mt-1 text-sm text-muted">
        Private notes with colleagues, synced on every device. Coordinate lessons without leaving
        Coursify.
      </p>
      <p className="mt-2 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-navy" : "bg-[#8a3b32]"}`} />
        {live ? "Live across devices" : "Reconnecting…"}
      </p>

      <div className="mt-6 grid min-h-[min(70dvh,560px)] flex-1 grid-cols-1 overflow-hidden rounded-xl border border-line bg-surface lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`border-b border-line lg:block lg:border-b-0 lg:border-r ${peer ? "hidden" : "block"}`}>
          <p className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Conversations</p>
          <div className="max-h-[min(50dvh,360px)] overflow-y-auto lg:max-h-[520px]">
            {ordered.map((conversation) => {
              const otherId = conversation.participantIds.find((id) => id !== currentUser?.id)
              const other = otherId ? educatorById(otherId) : undefined
              const unread = unreadIn(conversation.id)
              const last = messagesFor(conversation.id).at(-1)
              if (!other) return null
              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setActivePeer(other.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left ${
                    activePeer === other.id ? "bg-navy-soft" : "hover:bg-canvas"
                  }`}
                >
                  <Avatar educator={other} size={36} rounded="rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-ink">{other.name}</span>
                      {unread > 0 ? (
                        <span className="rounded-full bg-navy px-1.5 font-mono text-[10px] text-white">
                          {unread}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted">
                      {last?.body ?? "No messages yet"}
                    </span>
                  </span>
                </button>
              )
            })}
            {ordered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No threads yet. Start one from Discover.</p>
            ) : null}
          </div>
          {others.length > 0 ? (
            <div className="border-t border-line px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">New conversation</p>
              <select
                value={activePeer ?? ""}
                onChange={(event) => setActivePeer(event.target.value || null)}
                className="mt-2 h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink"
              >
                <option value="">Choose a colleague</option>
                {others.map((educator) => (
                  <option key={educator.id} value={educator.id}>
                    {educator.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </aside>

        <section className={`min-h-[360px] flex-col ${peer ? "flex" : "hidden lg:flex"}`}>
          {peer ? (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink hover:bg-canvas lg:hidden"
                    aria-label="Back to conversations"
                    onClick={() => setActivePeer(null)}
                  >
                    <Icons.ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAuthor(peer.id)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                  <Avatar educator={peer} size={36} rounded="rounded-lg" />
                  <span>
                    <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                      {peer.name}
                      {peer.verified ? <Icons.VerifiedSeal className="h-3.5 w-3.5 text-navy" /> : null}
                    </span>
                    <span className="block font-mono text-[11px] text-muted">{peer.school}</span>
                  </span>
                  </button>
                </div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-5 py-4">
                {thread.map((message) => {
                  const mine = message.senderId === currentUser?.id
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[min(100%,20rem)] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed sm:max-w-[80%] ${
                          mine ? "bg-navy text-white" : "border border-line bg-surface text-ink"
                        }`}
                      >
                        <p>{message.body}</p>
                        <p className={`mt-1 font-mono text-[10px] ${mine ? "text-white/55" : "text-muted"}`}>
                          {formatWhen(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {thread.length === 0 ? (
                  <p className="pt-8 text-center text-sm text-muted">
                    Start a conversation with {peer.name}.
                  </p>
                ) : null}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="border-t border-line p-3 sm:p-4">
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-navy"
                    placeholder={`Message ${peer.name}`}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-navy px-3.5 text-sm font-semibold text-white hover:bg-navy-hover"
                  >
                    <Icons.Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
                {error ? <p className="mt-2 text-sm text-[#8a3b32]">{error}</p> : null}
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <Icons.Message className="mx-auto h-8 w-8 text-navy" />
                <p className="mt-3 font-display text-[15px] font-semibold text-ink">Select a colleague</p>
                <p className="mt-1 text-sm text-muted">
                  Open a thread from the list, or start one from a profile in Discover.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
