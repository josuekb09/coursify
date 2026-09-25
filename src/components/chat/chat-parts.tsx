import FormatMark from "@/components/format-mark"
import Icons from "@/components/icons"
import { downloadDataUrl } from "@/utils"
import { downloadRemoteFile } from "@/utils"
import { EMOJI_CATALOG, searchEmojis } from "@/emojis"
import { formatFromExtension } from "@/formats"
import type { ChatMessage, Conversation, MessageStatus } from "@/types"
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { createPortal } from "react-dom"

/* ─── Status ─────────────────────────────────────────────────────────────────────────── */

/**
 * sending   → the write is still in the local cache, not yet acknowledged by Firestore
 * sent      → stored on the server
 * delivered → the recipient's app has been online since the message was sent, so their live
 *             listener received it
 * read      → the recipient opened the conversation after the message was sent (lastReadAt)
 */
export function messageStatus(
  message: ChatMessage,
  peerId: string,
  conversation: Conversation | undefined,
  peerLastActiveAt: string | undefined,
): MessageStatus {
  if (message.pending) return "sending"
  const peerRead = conversation?.lastReadAt[peerId]
  if (peerRead && peerRead >= message.createdAt) return "read"
  if (peerLastActiveAt && peerLastActiveAt >= message.createdAt) return "delivered"
  return "sent"
}

const statusLabel: Record<MessageStatus, string> = {
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
}

export function StatusTicks({ status, onDark = false }: { status: MessageStatus; onDark?: boolean }) {
  const base = onDark ? "text-white/60" : "text-muted"
  const read = onDark ? "text-[#9cd1ff]" : "text-receipt"
  return (
    <span className="inline-flex items-center" title={statusLabel[status]} aria-label={statusLabel[status]}>
      {status === "sending" ? (
        <Icons.Clock className={`h-3 w-3 ${base}`} />
      ) : status === "sent" ? (
        <Icons.Check className={`h-3.5 w-3.5 ${base}`} />
      ) : (
        <Icons.DoubleCheck
          className={`h-3.5 w-3.5 transition-colors duration-300 ${status === "read" ? read : base}`}
        />
      )}
    </span>
  )
}

/* ─── Time helpers ───────────────────────────────────────────────────────────────────── */

export function formatClock(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatDayDivider(iso: string) {
  const date = new Date(iso)
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return date.toLocaleDateString("en-ZA", { weekday: "long" })
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  })
}

export function formatListTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
  if (days === 0) return formatClock(iso)
  if (days === 1) return "Yesterday"
  if (days < 7) return date.toLocaleDateString("en-ZA", { weekday: "short" })
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
}

export function sameDay(a: string, b: string) {
  return startOfDay(new Date(a)) === startOfDay(new Date(b))
}

/* ─── Attachments ────────────────────────────────────────────────────────────────────── */

export function isVoiceNote(message: Pick<ChatMessage, "attachmentType" | "attachmentName" | "attachmentUrl">) {
  return Boolean(
    message.attachmentType?.startsWith("audio/") ||
      message.attachmentName?.toLowerCase().startsWith("voice note") ||
      message.attachmentUrl?.startsWith("data:audio/"),
  )
}

export function isImageAttachment(message: Pick<ChatMessage, "attachmentType" | "attachmentUrl">) {
  return Boolean(message.attachmentType?.startsWith("image/") || message.attachmentUrl?.startsWith("data:image/"))
}

export async function saveAttachment(url: string, name: string) {
  if (url.startsWith("data:")) {
    downloadDataUrl(name, url)
    return
  }
  await downloadRemoteFile(url, name)
}

function extensionLabel(name: string) {
  const ext = name.split(".").pop()?.toUpperCase() ?? ""
  return ext.length > 0 && ext.length <= 5 ? ext : "FILE"
}

export function FileAttachment({
  url,
  name,
  size,
  mine,
}: {
  url: string
  name: string
  size?: string
  mine: boolean
}) {
  const [busy, setBusy] = useState(false)
  const format = formatFromExtension(name)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await saveAttachment(url, name)
        } finally {
          setBusy(false)
        }
      }}
      className={`group/file flex w-full min-w-[220px] max-w-[300px] items-center gap-3 rounded-xl p-2.5 text-left transition-colors ${
        mine ? "bg-white/10 hover:bg-white/15" : "bg-canvas hover:bg-line/60"
      }`}
      title={`Download ${name}`}
    >
      <span
        className={`relative grid h-11 w-10 shrink-0 place-items-center rounded-lg ${
          mine ? "bg-white text-navy" : "bg-surface text-navy shadow-[0_1px_2px_rgba(18,20,28,0.08)]"
        }`}
      >
        {format ? <FormatMark format={format} className="h-4.5 w-4.5" /> : <Icons.File className="h-4.5 w-4.5" />}
        <span className="absolute -bottom-1 rounded bg-navy px-1 font-mono text-[8px] font-bold leading-[13px] text-white">
          {extensionLabel(name)}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight">{name}</span>
        <span className={`mt-0.5 block text-[11px] ${mine ? "text-white/65" : "text-muted"}`}>
          {size ? `${size} · ` : ""}
          {busy ? "Downloading…" : "Tap to download"}
        </span>
      </span>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-transform group-hover/file:-translate-y-px ${
          mine ? "bg-white/15" : "bg-surface"
        }`}
      >
        <Icons.Download className="h-4 w-4" />
      </span>
    </button>
  )
}

export function ImageAttachment({ url, name, onOpen }: { url: string; name: string; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block overflow-hidden rounded-[14px] bg-black/5"
      aria-label={`View ${name} full size`}
    >
      {!loaded ? <span className="block h-48 w-60 animate-pulse bg-black/5" /> : null}
      <img
        src={url}
        alt={name}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`block max-h-72 w-auto max-w-[min(260px,62vw)] object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "absolute inset-0 opacity-0"
        }`}
      />
    </button>
  )
}

export function ImageLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[80] flex flex-col bg-[#0b1222]/95 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
        <p className="min-w-0 truncate text-sm font-medium">{name}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void saveAttachment(url, name)}
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Download image"
          >
            <Icons.Download className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <Icons.Close className="h-5 w-5" />
          </button>
        </div>
      </div>
      <button type="button" className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8" onClick={onClose} aria-label="Close">
        <img
          src={url}
          alt={name}
          onClick={(event) => event.stopPropagation()}
          className="animate-pop-in max-h-full max-w-full rounded-lg object-contain shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        />
      </button>
    </div>,
    document.body,
  )
}

/* ─── Voice notes ────────────────────────────────────────────────────────────────────── */

function waveformFor(seed: string, count: number) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  return Array.from({ length: count }, (_, i) => {
    hash = Math.imul(hash ^ (i + 1), 2654435761)
    const noise = ((hash >>> 0) % 1000) / 1000
    const envelope = Math.sin((Math.PI * (i + 0.5)) / count) * 0.5 + 0.5
    return 0.22 + 0.78 * noise * envelope
  })
}

function formatSeconds(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function durationFromName(name?: string) {
  const match = name?.match(/(\d+):(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0
}

const SPEEDS = [1, 1.5, 2]

export function VoiceNote({ url, name, seed, mine }: { url: string; name?: string; seed: string; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(() => durationFromName(name))
  const [speed, setSpeed] = useState(1)
  const bars = useMemo(() => waveformFor(seed, 34), [seed])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrent(audio.currentTime)
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
    }
    const onEnd = () => {
      setPlaying(false)
      setCurrent(0)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onMeta)
    audio.addEventListener("durationchange", onMeta)
    audio.addEventListener("ended", onEnd)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.removeEventListener("durationchange", onMeta)
      audio.removeEventListener("ended", onEnd)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
    }
  }, [url])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.pause()
    else void audio.play().catch(() => setPlaying(false))
  }

  function seek(event: PointerEvent<HTMLDivElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrent(audio.currentTime)
  }

  const progress = duration > 0 ? current / duration : 0

  return (
    <div className="flex w-[min(280px,68vw)] items-center gap-2.5 py-0.5 select-none">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95 ${
          mine ? "bg-white text-navy" : "bg-navy text-white"
        }`}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          onPointerDown={seek}
          onKeyDown={(event) => {
            const audio = audioRef.current
            if (!audio) return
            if (event.key === "ArrowRight") audio.currentTime = Math.min(duration, audio.currentTime + 5)
            if (event.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5)
          }}
          className="flex h-7 cursor-pointer items-center gap-[2px] outline-none"
        >
          {bars.map((height, index) => {
            const filled = (index + 0.5) / bars.length <= progress
            return (
              <span
                key={index}
                className={`w-[3px] flex-1 rounded-full transition-colors duration-150 ${
                  filled ? (mine ? "bg-white" : "bg-navy") : mine ? "bg-white/35" : "bg-navy/20"
                }`}
                style={{ height: `${Math.round(height * 100)}%` }}
              />
            )
          })}
        </div>
        <div className={`mt-0.5 flex items-center justify-between text-[11px] tabular-nums ${mine ? "text-white/70" : "text-muted"}`}>
          <span>{formatSeconds(playing || current > 0 ? current : duration)}</span>
          <button
            type="button"
            onClick={() => setSpeed((value) => SPEEDS[(SPEEDS.indexOf(value) + 1) % SPEEDS.length])}
            className={`rounded-full px-1.5 font-semibold transition-colors ${mine ? "bg-white/15 hover:bg-white/25" : "bg-navy/8 hover:bg-navy/15"}`}
            aria-label="Change playback speed"
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Emoji picker ───────────────────────────────────────────────────────────────────── */

export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState(EMOJI_CATALOG[0].id)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const emojis = useMemo(() => {
    if (search.trim()) return searchEmojis(search)
    return (EMOJI_CATALOG.find((item) => item.id === category) ?? EMOJI_CATALOG[0]).emojis.map((item) => item.emoji)
  }, [category, search])

  return (
    <div
      ref={ref}
      className="animate-pop-in absolute bottom-full left-2 z-30 mb-2 w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-left overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_16px_48px_rgba(18,20,28,0.16)] sm:left-3"
    >
      <div className="p-2.5">
        <div className="relative">
          <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search emoji"
            className="h-9 w-full rounded-xl bg-canvas pl-8 pr-3 text-[13px] text-ink outline-none placeholder:text-muted focus:shadow-[0_0_0_3px_rgba(26,43,74,0.10)]"
          />
        </div>
      </div>
      <div className="grid h-56 grid-cols-8 content-start gap-0.5 overflow-y-auto px-2 pb-2 text-[22px]">
        {emojis.map((emoji, index) => (
          <button
            type="button"
            key={`${emoji}-${index}`}
            onClick={() => onPick(emoji)}
            className="grid aspect-square place-items-center rounded-lg transition-transform hover:bg-canvas active:scale-90"
          >
            {emoji}
          </button>
        ))}
        {emojis.length === 0 ? (
          <p className="col-span-8 py-8 text-center text-[13px] text-muted">No emoji match “{search}”</p>
        ) : null}
      </div>
      {!search.trim() ? (
        <div className="flex items-center justify-between gap-0.5 border-t border-line px-1.5 py-1.5">
          {EMOJI_CATALOG.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setCategory(item.id)}
              title={item.name}
              aria-label={item.name}
              className={`grid h-8 flex-1 place-items-center rounded-lg text-[17px] transition-colors ${
                category === item.id ? "bg-navy-soft" : "opacity-60 hover:bg-canvas hover:opacity-100"
              }`}
            >
              {item.icon}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
