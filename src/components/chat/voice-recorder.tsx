import Icons from "@/components/icons"
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

export const VOICE_LIMIT_SECONDS = 180
const CANCEL_DISTANCE = 110 // px to slide left before a held recording is thrown away
const LOCK_DISTANCE = 70 // px to slide up before a held recording locks hands-free
const MIN_HOLD_MS = 600 // shorter presses are treated as a tap and show the "hold to record" hint
const SAMPLE_MS = 70 // how often the live waveform takes a level reading
const LIVE_BARS = 44

type Phase = "idle" | "starting" | "holding" | "locked" | "review"

type Take = { file: File; url: string; peaks: number[]; seconds: number }

function buzz(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

/** Squeezes a list of level readings into `count` bars, keeping each bucket's loudest moment. */
export function bucketPeaks(levels: number[], count: number) {
  if (!levels.length) return Array.from({ length: count }, () => 0.15)
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i * levels.length) / count)
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / count))
    return Math.max(0.12, ...levels.slice(from, to))
  })
}

/**
 * The WhatsApp gesture on the microphone button:
 * - touch: hold to record, release to send, slide left to cancel, slide up to lock hands-free
 * - mouse / keyboard: click to start a hands-free recording
 * A locked recording can be stopped to listen back before sending.
 */
export function useVoiceRecorder({
  onSend,
  notify,
}: {
  onSend: (file: File) => void
  notify: (message: string) => void
}) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState<number[]>([])
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [hint, setHint] = useState(false)
  const [take, setTake] = useState<Take | null>(null)

  const phaseRef = useRef<Phase>("idle")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const levelsRef = useRef<number[]>([])
  const startedAtRef = useRef(0)
  const pressedAtRef = useRef(0)
  const originRef = useRef({ x: 0, y: 0 })
  const timerRef = useRef<number | null>(null)
  const outcomeRef = useRef<"send" | "review" | "discard">("discard")
  const releasedEarlyRef = useRef(false)
  const lastTouchRef = useRef(0)

  const go = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  const teardown = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
  }, [])

  const clearTake = useCallback(() => {
    setTake((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return null
    })
  }, [])

  useEffect(
    () => () => {
      outcomeRef.current = "discard"
      if (recorderRef.current?.state === "recording") recorderRef.current.stop()
      teardown()
    },
    [teardown],
  )

  const finish = useCallback(
    (outcome: "send" | "review" | "discard") => {
      outcomeRef.current = outcome
      const recorder = recorderRef.current
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
      if (recorder && recorder.state !== "inactive") {
        recorder.stop()
      } else {
        // Released before the microphone was ready: nothing was recorded.
        teardown()
        go("idle")
      }
      setDrag({ x: 0, y: 0 })
    },
    [go, teardown],
  )

  const start = useCallback(
    async (mode: "hold" | "locked") => {
      if (phaseRef.current !== "idle") return
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        notify("Voice notes aren't supported in this browser.")
        return
      }
      clearTake()
      releasedEarlyRef.current = false
      // Created inside the press so iOS lets it run; it feeds the live waveform.
      const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      const context = AudioContextClass ? new AudioContextClass() : null
      audioContextRef.current = context
      go("starting")
      setElapsed(0)
      setLevels([])
      levelsRef.current = []

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch {
        teardown()
        go("idle")
        notify("Coursify needs microphone access to record a voice note.")
        return
      }
      // The press ended while the permission prompt or microphone was still starting.
      if ((phaseRef.current as Phase) !== "starting" || releasedEarlyRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        teardown()
        go("idle")
        if (releasedEarlyRef.current) setHint(true)
        return
      }
      streamRef.current = stream

      let analyser: AnalyserNode | null = null
      if (context) {
        try {
          analyser = context.createAnalyser()
          analyser.fftSize = 512
          context.createMediaStreamSource(stream).connect(analyser)
          void context.resume()
        } catch {
          analyser = null
        }
      }

      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type))
      let recorder: MediaRecorder
      try {
        recorder = new MediaRecorder(stream, { audioBitsPerSecond: 24_000, ...(mimeType ? { mimeType } : {}) })
      } catch {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      }
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const seconds = Math.min(VOICE_LIMIT_SECONDS, (Date.now() - startedAtRef.current) / 1000)
        const outcome = outcomeRef.current
        const chunks = chunksRef.current
        const peaks = levelsRef.current
        recorderRef.current = null
        teardown()
        if (outcome === "discard") {
          go("idle")
          return
        }
        if (!chunks.length || seconds < 0.8) {
          go("idle")
          notify("That voice note was too short.")
          return
        }
        const type = recorder.mimeType || "audio/webm"
        const ext = type.includes("mp4") ? "m4a" : "webm"
        const file = new File(chunks, `Voice note (${formatDuration(Math.round(seconds))}).${ext}`, { type })
        if (outcome === "send") {
          go("idle")
          onSend(file)
          return
        }
        setTake({ file, url: URL.createObjectURL(file), peaks, seconds })
        go("review")
      }

      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      recorder.start(200)
      buzz()
      go(mode === "locked" ? "locked" : "holding")

      const buffer = analyser ? new Uint8Array(analyser.fftSize) : null
      timerRef.current = window.setInterval(() => {
        const seconds = (Date.now() - startedAtRef.current) / 1000
        setElapsed(seconds)
        let level = 0.12
        if (analyser && buffer) {
          analyser.getByteTimeDomainData(buffer)
          let sum = 0
          for (const value of buffer) sum += ((value - 128) / 128) ** 2
          // RMS of speech sits around 0.02–0.3; lift it so normal talking fills the bar.
          level = Math.min(1, Math.max(0.12, Math.sqrt(sum / buffer.length) * 4.5))
        }
        levelsRef.current.push(level)
        setLevels((current) => [...current.slice(-(LIVE_BARS - 1)), level])
        if (seconds >= VOICE_LIMIT_SECONDS) {
          notify("Voice notes can be up to 3 minutes.")
          finish(phaseRef.current === "locked" ? "review" : "send")
        }
      }, SAMPLE_MS)
    },
    [clearTake, finish, go, notify, onSend, teardown],
  )

  // Follow the finger while the button is held, anywhere on the screen.
  useEffect(() => {
    if (phase !== "holding" && phase !== "starting") return
    function onMove(event: PointerEvent) {
      const x = Math.min(0, event.clientX - originRef.current.x)
      const y = Math.min(0, event.clientY - originRef.current.y)
      setDrag({ x, y })
      if (phaseRef.current !== "holding") return
      if (x < -CANCEL_DISTANCE) {
        buzz(20)
        finish("discard")
      } else if (y < -LOCK_DISTANCE) {
        buzz()
        setDrag({ x: 0, y: 0 })
        go("locked")
      }
    }
    function onUp() {
      if (phaseRef.current === "starting") {
        releasedEarlyRef.current = true
        return
      }
      if (phaseRef.current !== "holding") return
      if (Date.now() - pressedAtRef.current < MIN_HOLD_MS) {
        finish("discard")
        setHint(true)
      } else {
        finish("send")
      }
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [finish, go, phase])

  useEffect(() => {
    if (!hint) return
    const id = window.setTimeout(() => setHint(false), 2200)
    return () => window.clearTimeout(id)
  }, [hint])

  /** Props for the microphone button. */
  const micProps = {
    onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return
      if (event.pointerType === "mouse") return // a mouse click starts hands-free in onClick
      event.preventDefault()
      lastTouchRef.current = Date.now()
      originRef.current = { x: event.clientX, y: event.clientY }
      pressedAtRef.current = Date.now()
      setDrag({ x: 0, y: 0 })
      void start("hold")
    },
    onClick(event: React.MouseEvent<HTMLButtonElement>) {
      // Touch presses are handled by the hold gesture; this covers mouse and keyboard.
      if (Date.now() - lastTouchRef.current < 1000) return
      void start("locked")
    },
    onContextMenu(event: React.MouseEvent) {
      event.preventDefault()
    },
  }

  return {
    phase,
    elapsed,
    levels,
    drag,
    hint,
    take,
    micProps,
    cancel: () => finish("discard"),
    stopToReview: () => finish("review"),
    sendNow: () => finish("send"),
    discardTake: () => {
      clearTake()
      go("idle")
    },
    sendTake: () => {
      if (!take) return
      const file = take.file
      clearTake()
      go("idle")
      onSend(file)
    },
  }
}

/* ─── UI ─────────────────────────────────────────────────────────────────────────────── */

function LiveWave({ levels }: { levels: number[] }) {
  const padded = [...Array.from({ length: Math.max(0, LIVE_BARS - levels.length) }, () => 0), ...levels]
  return (
    <span className="flex h-6 min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden" aria-hidden="true">
      {padded.map((level, i) => (
        <span
          key={i}
          className={`w-[3px] shrink-0 rounded-full transition-[height] duration-75 ${level ? "bg-navy/70" : "bg-navy/15"}`}
          style={{ height: `${Math.round(Math.max(0.12, level) * 100)}%` }}
        />
      ))}
    </span>
  )
}

function RecordingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d64545] opacity-50" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#d64545]" />
    </span>
  )
}

/** Listen back to a locked recording before sending it. */
function TakePlayer({ take }: { take: Take }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const bars = bucketPeaks(take.peaks, 36)
  const progress = take.seconds ? current / take.seconds : 0

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <audio
        ref={audioRef}
        src={take.url}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setCurrent(0)
        }}
      />
      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current
          if (!audio) return
          if (playing) audio.pause()
          else void audio.play().catch(() => setPlaying(false))
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-white active:scale-95"
        aria-label={playing ? "Pause" : "Listen back"}
      >
        {playing ? <Icons.Pause className="h-3.5 w-3.5" /> : <Icons.Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      <span
        role="slider"
        tabIndex={0}
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(take.seconds)}
        aria-valuenow={Math.round(current)}
        onPointerDown={(event) => {
          const audio = audioRef.current
          if (!audio) return
          const rect = event.currentTarget.getBoundingClientRect()
          audio.currentTime = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * take.seconds
          setCurrent(audio.currentTime)
        }}
        className="flex h-6 min-w-0 flex-1 cursor-pointer items-center gap-[2px]"
      >
        {bars.map((level, i) => (
          <span
            key={i}
            className={`w-[3px] flex-1 rounded-full transition-colors ${(i + 0.5) / bars.length <= progress ? "bg-navy" : "bg-navy/25"}`}
            style={{ height: `${Math.round(level * 100)}%` }}
          />
        ))}
      </span>
      <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">
        {formatDuration(playing || current > 0 ? current : take.seconds)}
      </span>
    </div>
  )
}

/** Replaces the text field while a voice note is being recorded or reviewed. */
export function VoiceRecorderBar({ recorder }: { recorder: ReturnType<typeof useVoiceRecorder> }) {
  const { phase, elapsed, levels, drag, take } = recorder

  if (phase === "review" && take) {
    return (
      <div className="animate-fade-in flex h-11 min-w-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          onClick={recorder.discardTake}
          className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-[#8a3b32]"
          aria-label="Delete voice note"
          title="Delete"
        >
          <Icons.Trash className="h-5 w-5" />
        </button>
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-canvas px-1.5 pr-3.5">
          <TakePlayer take={take} />
        </div>
      </div>
    )
  }

  if (phase === "locked") {
    return (
      <div className="animate-fade-in flex h-11 min-w-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          onClick={recorder.cancel}
          className="grid h-11 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-[#8a3b32]"
          aria-label="Delete recording"
          title="Delete"
        >
          <Icons.Trash className="h-5 w-5" />
        </button>
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-canvas px-3.5">
          <RecordingDot />
          <span className="w-10 shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink">{formatDuration(elapsed)}</span>
          <LiveWave levels={levels} />
          <button
            type="button"
            onClick={recorder.stopToReview}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#d64545] transition-colors hover:bg-[#fbeeec]"
            aria-label="Stop and listen back"
            title="Stop and listen back"
          >
            <Icons.Stop className="h-4 w-4" filled />
          </button>
        </div>
      </div>
    )
  }

  // Holding (or waiting for the microphone): the finger is still on the button.
  const cancelProgress = Math.min(1, -drag.x / CANCEL_DISTANCE)
  return (
    <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-full bg-canvas px-3.5 select-none">
      <RecordingDot />
      <span className="w-10 shrink-0 font-mono text-[13px] font-semibold tabular-nums text-ink">{formatDuration(elapsed)}</span>
      <span
        className="flex min-w-0 flex-1 items-center justify-center gap-1 text-[13px] text-muted"
        style={{ transform: `translateX(${drag.x * 0.6}px)`, opacity: 1 - cancelProgress * 0.8 }}
      >
        <Icons.ChevronLeft className="h-4 w-4 animate-pulse" />
        Slide to cancel
      </span>
    </div>
  )
}

/** The lock rail that floats above the microphone while it is held. */
export function LockRail({ recorder }: { recorder: ReturnType<typeof useVoiceRecorder> }) {
  if (recorder.phase !== "holding") return null
  const lift = Math.min(1, -recorder.drag.y / LOCK_DISTANCE)
  return (
    <div
      className="animate-pop-in pointer-events-none absolute bottom-[calc(100%+10px)] right-0 flex w-11 flex-col items-center gap-1 rounded-full border border-line bg-surface py-2.5 shadow-[0_8px_24px_rgba(18,20,28,0.12)]"
      style={{ transform: `translateY(${-lift * 14}px)` }}
      aria-hidden="true"
    >
      <Icons.Lock className={`h-4 w-4 transition-colors ${lift > 0.6 ? "text-navy" : "text-muted"}`} />
      <Icons.ChevronUp className="h-4 w-4 animate-bounce text-muted" />
    </div>
  )
}
