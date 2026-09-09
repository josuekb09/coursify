import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import { MAX_FILE_BYTES } from "@/data"
import { isFounderEmail } from "@/security"
import { useApp } from "@/store"
import type { ChatAttachment } from "@/types"
import { educatorMatchesQuery, formatEducatorActivity, isEducatorOnline } from "@/utils"
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"

import { EMOJI_CATALOG, searchEmojis } from "@/emojis"

function AudioMessageBubble({
  url,
  name,
  durationText,
  mine,
}: {
  url: string
  name?: string
  durationText?: string
  mine: boolean
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
    }
  }, [url])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      void audio.play().catch(() => setIsPlaying(false))
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const formatSecs = (sec: number) => {
    if (!Number.isFinite(sec) || sec <= 0) return "0:00"
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  const effectiveDuration = duration > 0 ? duration : 0
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-2.5 transition-all select-none ${
        mine
          ? "bg-white/12 text-white border border-white/15"
          : "bg-surface text-ink border border-line shadow-2xs"
      }`}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95 shadow-sm ${
          mine
            ? "bg-white text-navy hover:bg-white/90"
            : "bg-navy text-white hover:bg-navy-hover"
        }`}
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4 ml-0.5" />}
      </button>

      {/* Waveform track & timing */}
      <div className="flex-1 min-w-[140px] sm:min-w-[180px]">
        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
          <span className={mine ? "text-white/80" : "text-muted"}>
            {formatSecs(currentTime)}
          </span>
          <span className={mine ? "text-white/60" : "text-muted/80"}>
            {effectiveDuration > 0 ? formatSecs(effectiveDuration) : (durationText || name || "Voice note")}
          </span>
        </div>

        {/* Interactive scrubber */}
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={effectiveDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-navy bg-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Seek audio"
          />
          {/* Custom visual progress track */}
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <div
              className={`h-1.5 w-full rounded-full overflow-hidden ${
                mine ? "bg-white/25" : "bg-slate-200"
              }`}
            >
              <div
                className={`h-full transition-all duration-75 ${
                  mine ? "bg-white" : "bg-navy"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatChatSidebarTime(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    }
    if (diffDays <= 1) {
      return "Yesterday"
    }
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  } catch {
    return iso.slice(11, 16)
  }
}

function formatBubbleTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  } catch {
    return iso.slice(11, 16)
  }
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
    messagesFor,
    unreadIn,
    unreadCount,
    educatorById,
    live,
    notify,
  } = useApp()

  const [activePeer, setActivePeer] = useState<string | null>(peerId)
  const [convoSearch, setConvoSearch] = useState("")
  const [draft, setDraft] = useState("")
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState<string>("smileys")
  const [emojiSearch, setEmojiSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (peerId) setActivePeer(peerId)
  }, [peerId])

  // Cleanup media recording streams on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Close emoji popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPopoverRef.current && !emojiPopoverRef.current.contains(e.target as Node)) {
        setEmojiOpen(false)
      }
    }
    if (emojiOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [emojiOpen])

  // Filter conversations in sidebar
  const orderedConversations = useMemo(() => {
    const list = [...conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    const needle = (convoSearch || query).trim().toLowerCase()
    if (!needle) return list
    return list.filter((conversation) => {
      const otherId = conversation.participantIds.find((id) => id !== currentUser?.id)
      const other = otherId ? educatorById(otherId) : undefined
      if (!other) return false
      const matchesName = other.name.toLowerCase().includes(needle) || other.school.toLowerCase().includes(needle)
      const lastMsg = messagesFor(conversation.id).at(-1)?.body.toLowerCase() ?? ""
      const matchesMsg = lastMsg.includes(needle)
      return matchesName || matchesMsg || educatorMatchesQuery(other, needle)
    })
  }, [conversations, convoSearch, currentUser?.id, educatorById, messagesFor, query])

  const peer = activePeer ? educatorById(activePeer) : undefined
  const isPeerCreator = peer ? isFounderEmail(peer.email) : false
  const peerOnline = peer ? isEducatorOnline(peer.lastActiveAt) : false
  const peerActivity = peer ? formatEducatorActivity(peer.lastActiveAt) : { isOnline: false, label: "Offline" }
  const conversationId = orderedConversations.find((item) => item.participantIds.includes(activePeer ?? ""))?.id
  const thread = conversationId ? messagesFor(conversationId) : []

  // Mark read when thread opened
  useEffect(() => {
    if (conversationId && unreadIn(conversationId) > 0) {
      markConversationRead(conversationId)
    }
  }, [conversationId, markConversationRead, thread.length, unreadIn])

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [thread.length, activePeer])

  async function handleSend(event?: FormEvent) {
    if (event) event.preventDefault()
    if (!activePeer || sending || (!draft.trim() && !attachment)) return
    setSending(true)
    setError(null)
    try {
      const result = await sendMessage(activePeer, draft, attachment ?? undefined)
      if (result) {
        setError(result)
        return
      }
      setDraft("")
      setAttachment(null)
      setEmojiOpen(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that message. Please try again.")
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ""
    if (file.size > MAX_FILE_BYTES) {
      notify(`Attachments must be ${Math.round(MAX_FILE_BYTES / 1_048_576)}MB or smaller.`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const att = await uploadChatAttachment(file)
      setAttachment(att)
      notify(`Attached ${file.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attach file.")
    } finally {
      setUploading(false)
      textareaRef.current?.focus()
    }
  }

  function handleInsertEmoji(emoji: string) {
    setDraft((prev) => prev + emoji)
    textareaRef.current?.focus()
  }

  // Voice recording handlers
  async function handleStartRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        notify("Microphone recording is not supported on this browser.")
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      audioChunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : ""

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.start(250)
      setIsRecording(true)
      setRecordingSeconds(0)

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      const start = Date.now()
      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000)
        setRecordingSeconds(elapsed)
        if (elapsed >= 120) {
          void handleSendRecording()
        }
      }, 500)
    } catch (err) {
      console.error("Mic access error:", err)
      notify("Microphone access was denied or is unavailable.")
    }
  }

  function handleCancelRecording() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  async function handleSendRecording() {
    if (!mediaRecorderRef.current || !activePeer) return

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    const durationSecs = recordingSeconds
    const recorder = mediaRecorderRef.current
    const stream = mediaStreamRef.current

    recorder.onstop = async () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }

      const chunks = audioChunksRef.current
      if (chunks.length === 0 || durationSecs < 1) {
        notify("Voice message was too short.")
        setIsRecording(false)
        setRecordingSeconds(0)
        return
      }

      const mime = recorder.mimeType || "audio/webm"
      const blob = new Blob(chunks, { type: mime })

      const reader = new FileReader()
      reader.onloadend = async () => {
        const dataUrl = reader.result as string
        const min = Math.floor(durationSecs / 60)
        const sec = durationSecs % 60
        const durationFormatted = `${min}:${sec < 10 ? "0" : ""}${sec}`
        const sizeStr = `${(blob.size / 1024).toFixed(1)} KB`

        const voiceAtt: ChatAttachment = {
          name: `Voice note (${durationFormatted})`,
          url: dataUrl,
          type: mime,
          size: sizeStr,
        }

        setSending(true)
        try {
          const res = await sendMessage(activePeer, "", voiceAtt)
          if (res) {
            setError(res)
          } else {
            notify("Voice note sent")
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to send voice note.")
        } finally {
          setSending(false)
          setIsRecording(false)
          setRecordingSeconds(0)
        }
      }
      reader.readAsDataURL(blob)
    }

    if (recorder.state !== "inactive") {
      try {
        recorder.stop()
      } catch {
        // ignore
      }
    }
  }

  const displayedEmojis: string[] = useMemo(() => {
    if (emojiSearch.trim()) {
      return searchEmojis(emojiSearch)
    }
    const cat = EMOJI_CATALOG.find((c) => c.id === emojiCategory)
    return cat ? cat.emojis.map((e) => e.emoji) : EMOJI_CATALOG[0].emojis.map((e) => e.emoji)
  }, [emojiCategory, emojiSearch])

  const otherEducators = useMemo(() => {
    const pool = educators.filter((e) => e.id !== currentUser?.id)
    if (!convoSearch.trim()) return pool
    return pool.filter((e) => educatorMatchesQuery(e, convoSearch))
  }, [currentUser?.id, educators, convoSearch])

  return (
    <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Title & Connection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Messages
            </h1>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-navy px-2.5 py-0.5 font-mono text-xs font-bold text-white shadow-2xs">
                {unreadCount} new
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            Private, real-time curriculum coordination and notes with verified educators.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-muted self-start sm:self-auto">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                live ? "animate-ping bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                live ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="font-medium text-ink">
            {live ? "Faculty Network Active" : "Connecting…"}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="mt-6 grid min-h-[min(74dvh,640px)] flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_8px_30px_rgba(0,0,0,0.04)] lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Sidebar: Conversations List */}
        <aside
          className={`flex flex-col border-b border-line bg-surface lg:block lg:border-b-0 lg:border-r ${
            peer ? "hidden" : "flex"
          }`}
        >
          {/* Sidebar Header & Search Filter */}
          <div className="border-b border-line/70 p-3.5">
            <div className="relative flex items-center">
              <Icons.Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
              <input
                value={convoSearch}
                onChange={(e) => setConvoSearch(e.target.value)}
                placeholder="Search conversations or peers…"
                className="h-10 w-full rounded-xl border border-line bg-canvas/70 pl-9 pr-8 text-xs text-ink outline-none transition-all placeholder:text-muted/70 focus:border-navy focus:bg-surface focus:shadow-2xs"
              />
              {convoSearch ? (
                <button
                  type="button"
                  onClick={() => setConvoSearch("")}
                  className="absolute right-2.5 grid h-5 w-5 place-items-center rounded-full text-muted hover:text-ink"
                >
                  <Icons.Close className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto max-h-[min(55dvh,480px)] lg:max-h-[580px] divide-y divide-line/40">
            {orderedConversations.map((conversation) => {
              const otherId = conversation.participantIds.find((id) => id !== currentUser?.id)
              const other = otherId ? educatorById(otherId) : undefined
              if (!other) return null

              const unread = unreadIn(conversation.id)
              const last = messagesFor(conversation.id).at(-1)
              const isSelected = activePeer === other.id
              const isOtherCreator = isFounderEmail(other.email)
              const lastIsMine = last?.senderId === currentUser?.id
              const otherOnline = isEducatorOnline(other.lastActiveAt)
              const otherActivity = formatEducatorActivity(other.lastActiveAt)

              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setActivePeer(other.id)}
                  className={`group relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-all ${
                    isSelected
                      ? "bg-navy/5 border-l-4 border-navy"
                      : "hover:bg-canvas/80"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar educator={other} size={42} rounded="rounded-xl" />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface transition-colors ${
                        otherOnline
                          ? "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]"
                          : "bg-slate-300"
                      }`}
                      title={otherActivity.label}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5 truncate text-[13px] font-bold text-ink">
                        <span className="truncate">{other.name}</span>
                        {isOtherCreator ? (
                          <Icons.VerifiedSeal className="h-3 w-3 shrink-0 text-navy" />
                        ) : other.verified ? (
                          <Icons.VerifiedSeal className="h-3 w-3 shrink-0 text-sky-600" />
                        ) : null}
                      </span>

                      {last ? (
                        <span className="shrink-0 font-mono text-[10px] text-muted">
                          {formatChatSidebarTime(last.createdAt)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className={`truncate text-xs ${unread > 0 ? "font-semibold text-ink" : "text-muted"}`}>
                        {last ? (
                          <>
                            {lastIsMine ? <span className="font-mono text-muted/80">You: </span> : null}
                            <span>{last.body}</span>
                          </>
                        ) : (
                          <span className="italic text-muted/70">No messages yet</span>
                        )}
                      </p>

                      {unread > 0 ? (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-navy px-1 font-mono text-[10px] font-bold text-white shadow-2xs">
                          {unread}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}

            {orderedConversations.length === 0 ? (
              <div className="p-6 text-center">
                <Icons.Message className="mx-auto h-7 w-7 text-muted/60" />
                <p className="mt-2 text-xs font-semibold text-ink">No conversations found</p>
                <p className="mt-1 text-[11px] text-muted">
                  Choose a colleague below or connect with peers in Discover.
                </p>
              </div>
            ) : null}
          </div>

          {/* Quick Start / Colleague Selector */}
          {otherEducators.length > 0 ? (
            <div className="border-t border-line bg-canvas/50 p-3.5">
              <label className="mb-1.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                <span>Start New Thread</span>
                <span className="text-muted/60">{otherEducators.length} available</span>
              </label>
              <select
                value={activePeer ?? ""}
                onChange={(event) => setActivePeer(event.target.value || null)}
                aria-label="Start conversation with a colleague"
                className="h-9 w-full rounded-xl border border-line bg-surface px-3 text-xs font-medium text-ink outline-none transition focus:border-navy"
              >
                <option value="">Select a faculty colleague…</option>
                {otherEducators.map((educator) => (
                  <option key={educator.id} value={educator.id}>
                    {educator.name} · {educator.school || educator.subject}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </aside>

        {/* Chat Window (Active Conversation) */}
        <section className={`min-h-[420px] flex-col bg-[#f8f9fb] ${peer ? "flex" : "hidden lg:flex"}`}>
          {peer ? (
            <>
              {/* Chat Header */}
              <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6 shadow-2xs">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink hover:bg-canvas lg:hidden"
                    aria-label="Back to conversations list"
                    onClick={() => setActivePeer(null)}
                  >
                    <Icons.ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onAuthor(peer.id)}
                    className="group flex min-w-0 items-center gap-3 text-left"
                    title="View faculty profile"
                  >
                    <div className="relative shrink-0">
                      <Avatar educator={peer} size={40} rounded="rounded-xl" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface transition-colors ${
                          peerOnline
                            ? "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]"
                            : "bg-slate-300"
                        }`}
                        title={peerActivity.label}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-ink group-hover:text-navy transition-colors">
                          {peer.name}
                        </span>
                        {isPeerCreator ? (
                          <span className="inline-flex items-center gap-1 rounded bg-navy/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-navy">
                            <Icons.VerifiedSeal className="h-2.5 w-2.5" />
                            Founder
                          </span>
                        ) : peer.verified ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-sky-700">
                            <Icons.VerifiedSeal className="h-2.5 w-2.5" />
                            Verified
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate font-mono text-[11px] text-muted flex items-center gap-1.5">
                        <span className="truncate">{peer.school ? `${peer.school} · ` : ""}{peer.subject}</span>
                        <span className="text-muted/60">•</span>
                        <span className={`inline-flex items-center gap-1 ${peerOnline ? "font-semibold text-emerald-600" : "text-muted"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${peerOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {peerActivity.label}
                        </span>
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAuthor(peer.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:border-navy hover:text-navy transition"
                  >
                    <Icons.Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">View Profile</span>
                  </button>
                </div>
              </header>

              {/* Messages Feed */}
              <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-6">
                <div className="mx-auto my-2 w-max rounded-full border border-line bg-surface/80 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted shadow-2xs backdrop-blur-xs">
                  Encrypted Academic Channel
                </div>

                {thread.map((message) => {
                  const mine = message.senderId === currentUser?.id
                  return (
                    <div
                      key={message.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
                    >
                      <div
                        className={`group relative max-w-[88%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm transition-shadow ${
                          mine
                            ? "bg-navy text-white rounded-br-xs"
                            : "bg-surface text-ink border border-line/80 rounded-bl-xs"
                        }`}
                      >
                        {/* Message text */}
                        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                          {message.body}
                        </p>

                        {/* Attachment Preview Card if present */}
                        {message.attachmentUrl ? (
                          <div className="mt-2.5">
                            {message.attachmentType?.startsWith("audio/") ||
                            message.attachmentName?.toLowerCase().includes("voice note") ||
                            message.attachmentUrl.startsWith("data:audio/") ? (
                              <AudioMessageBubble
                                url={message.attachmentUrl}
                                name={message.attachmentName}
                                durationText={message.attachmentSize}
                                mine={mine}
                              />
                            ) : message.attachmentType?.startsWith("image/") ? (
                              <a
                                href={message.attachmentUrl}
                                download={message.attachmentName ?? "image"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block overflow-hidden rounded-xl border border-white/20"
                              >
                                <img
                                  src={message.attachmentUrl}
                                  alt={message.attachmentName ?? "Chat attachment"}
                                  className="max-h-60 w-full object-cover transition hover:scale-102"
                                />
                              </a>
                            ) : (
                              <a
                                href={message.attachmentUrl}
                                download={message.attachmentName ?? "attachment"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-3 rounded-xl p-2.5 text-xs font-semibold transition ${
                                  mine
                                    ? "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                                    : "bg-canvas text-ink hover:bg-line/40 border border-line"
                                }`}
                              >
                                <Icons.Paperclip className="h-4 w-4 shrink-0 opacity-80" />
                                <div className="min-w-0 flex-1 truncate">
                                  <p className="truncate">{message.attachmentName || "Attachment File"}</p>
                                  {message.attachmentSize ? (
                                    <p className="font-mono text-[10px] opacity-70">{message.attachmentSize}</p>
                                  ) : null}
                                </div>
                                <Icons.Download className="h-4 w-4 shrink-0 opacity-80" />
                              </a>
                            )}
                          </div>
                        ) : null}

                        {/* Timestamp & Status Receipts */}
                        <div
                          className={`mt-1.5 flex items-center justify-end gap-1.5 font-mono text-[10px] ${
                            mine ? "text-white/70" : "text-muted"
                          }`}
                        >
                          <span>{formatBubbleTime(message.createdAt)}</span>
                          {mine ? (
                            <span title="Delivered & Synced" className="inline-flex items-center">
                              <Icons.DoubleCheck className="h-3.5 w-3.5 text-sky-300" />
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {thread.length === 0 ? (
                  <div className="pt-12 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface border border-line text-navy shadow-xs">
                      <Icons.Message className="h-6 w-6" />
                    </div>
                    <p className="mt-3 font-display text-sm font-bold text-ink">
                      No messages yet with {peer.name}
                    </p>
                    <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                      Say hello, share curriculum insights, or plan a joint teaching workshop.
                    </p>
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>

              {/* Pending Attachment Notification Card */}
              {attachment ? (
                <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-line bg-surface p-2.5 shadow-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <Icons.Paperclip className="h-4 w-4 text-navy shrink-0" />
                    <span className="truncate text-xs font-semibold text-ink">{attachment.name}</span>
                    <span className="font-mono text-[10px] text-muted shrink-0">({attachment.size})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink"
                    title="Remove attachment"
                  >
                    <Icons.Close className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              {/* Chat Input Bar */}
              <div className="relative border-t border-line bg-surface p-3 sm:p-4">
                {/* Complete Emoji Suite Drawer Popover */}
                {emojiOpen ? (
                  <div
                    ref={emojiPopoverRef}
                    className="absolute bottom-full left-2 sm:left-4 mb-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl border border-line bg-surface/98 p-3 shadow-2xl backdrop-blur-md z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  >
                    {/* Header with Search & Close */}
                    <div className="flex items-center gap-2 border-b border-line pb-2.5 mb-2">
                      <div className="relative flex-1">
                        <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                        <input
                          type="text"
                          value={emojiSearch}
                          onChange={(e) => setEmojiSearch(e.target.value)}
                          placeholder="Search all emojis, flags & smileys…"
                          className="h-8 w-full rounded-xl border border-line bg-canvas/60 pl-8 pr-2 text-xs text-ink outline-none focus:border-navy"
                        />
                        {emojiSearch ? (
                          <button
                            type="button"
                            onClick={() => setEmojiSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                          >
                            <Icons.Close className="h-3 w-3" />
                          </button>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmojiOpen(false)}
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink transition"
                        aria-label="Close emoji picker"
                      >
                        <Icons.Close className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Category Selector Tabs */}
                    {!emojiSearch.trim() ? (
                      <div className="flex items-center gap-1 border-b border-line/60 pb-2 mb-2 overflow-x-auto">
                        {EMOJI_CATALOG.map((cat) => (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => setEmojiCategory(cat.id)}
                            className={`flex items-center gap-1 shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                              emojiCategory === cat.id
                                ? "bg-navy text-white shadow-2xs"
                                : "text-muted hover:bg-canvas hover:text-ink"
                            }`}
                          >
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {/* Emoji Grid */}
                    <div className="grid grid-cols-8 gap-1 overflow-y-auto max-h-56 p-0.5 text-xl">
                      {displayedEmojis.map((emoji, index) => (
                        <button
                          type="button"
                          key={`${emoji}-${index}`}
                          onClick={() => handleInsertEmoji(emoji)}
                          className="grid h-9 w-9 place-items-center rounded-xl hover:bg-canvas hover:scale-110 active:scale-95 transition-transform"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                      {displayedEmojis.length === 0 ? (
                        <div className="col-span-8 py-6 text-center text-xs text-muted">
                          No emojis found for "{emojiSearch}"
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.key,.txt,.zip"
                />

                {isRecording ? (
                  /* Live Voice Recording Bar */
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-2.5 shadow-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
                      </div>
                      <span className="text-xs font-semibold text-rose-900">Recording voice note…</span>
                      <span className="font-mono text-xs font-bold text-rose-700">
                        {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
                      </span>
                      <span className="font-mono text-[10px] text-rose-500">/ 2:00</span>
                      {/* Soundwave animation */}
                      <div className="hidden sm:flex items-center gap-0.5 h-4 ml-1">
                        {[40, 80, 100, 60, 90, 50, 75, 45].map((h, i) => (
                          <span
                            key={i}
                            className="w-1 bg-rose-500 rounded-full animate-pulse"
                            style={{
                              height: `${h}%`,
                              animationDelay: `${i * 120}ms`,
                              animationDuration: "750ms",
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelRecording}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                        title="Discard voice recording"
                      >
                        <Icons.Trash className="h-3.5 w-3.5" />
                        <span>Discard</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendRecording}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition active:scale-95"
                        title="Send voice note"
                      >
                        <Icons.Send className="h-3.5 w-3.5" />
                        <span>Send Audio</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    {/* Emoji Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((prev) => !prev)}
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ${
                        emojiOpen ? "bg-navy/10 text-navy" : "text-muted hover:bg-canvas hover:text-ink"
                      }`}
                      title="Insert emoji"
                    >
                      <Icons.Smile className="h-5 w-5" />
                    </button>

                    {/* Attachment Trigger Button */}
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-muted hover:bg-canvas hover:text-ink transition disabled:opacity-50"
                      title="Attach document or media"
                    >
                      <Icons.Paperclip className="h-5 w-5" />
                    </button>

                    {/* Voice Note Recording Trigger */}
                    <button
                      type="button"
                      disabled={sending || uploading}
                      onClick={handleStartRecording}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-muted hover:bg-canvas hover:text-navy transition disabled:opacity-50"
                      title="Record voice note"
                    >
                      <Icons.Mic className="h-5 w-5" />
                    </button>

                    {/* Message Input with sleek Type a message... placeholder */}
                    <div className="relative flex-1">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={draft}
                        onChange={(event) => {
                          setDraft(event.target.value)
                          if (textareaRef.current) {
                            textareaRef.current.style.height = "auto"
                            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
                          }
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={sending}
                        className="min-h-[44px] max-h-32 w-full resize-none rounded-2xl border border-line bg-canvas/80 px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 hover:border-line-strong focus:border-navy focus:bg-surface focus:shadow-2xs disabled:opacity-60 leading-relaxed"
                        placeholder={uploading ? "Uploading attachment…" : "Type a message..."}
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={sending || uploading || (!draft.trim() && !attachment)}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-navy px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-hover active:scale-98 disabled:opacity-40"
                      title="Send message"
                    >
                      <Icons.Send className="h-4 w-4" />
                      <span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span>
                    </button>
                  </form>
                )}

                {error ? (
                  <p className="mt-2 text-xs font-medium text-rose-600 animate-in fade-in">
                    {error}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            /* Empty State: No Colleague Selected */
            <div className="grid flex-1 place-items-center p-8 text-center bg-[#f8f9fb]">
              <div className="max-w-md">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-surface border border-line text-navy shadow-sm">
                  <Icons.Message className="h-8 w-8" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-ink">
                  Select a faculty colleague
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Open an existing thread from the left or select a colleague from the dropdown to start collaborating.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
