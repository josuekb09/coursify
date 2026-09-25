import FormatMark from "@/components/format-mark"
import Icons from "@/components/icons"
import SubjectPicker from "@/components/subject-picker"
import { grades, MAX_FILE_BYTES } from "@/data"
import {
  FORMAT_META,
  FORMAT_ORDER,
  formatFromExtension,
  inferFormatFromUrl,
} from "@/formats"
import { useApp } from "@/store"
import type { ResourceFormat, ResourceKind, UploadInput } from "@/types"
import { formatBytes } from "@/utils"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"

const field =
  "h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none transition-shadow focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.10)]"

const label = "mb-1.5 block text-[12px] font-semibold text-ink"

const kinds: { id: ResourceKind; label: string }[] = [
  { id: "resource", label: "Resource" },
  { id: "lesson-plan", label: "Lesson plan" },
  { id: "collection", label: "Collection" },
]

type Phase = "form" | "uploading" | "device-only"

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const { uploadResource, notify } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("form")
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<UploadInput>({
    title: "",
    subject: "Mathematics",
    grade: "Grade 10",
    kind: "resource",
    format: "document",
    file: null,
    sourceUrl: "",
  })

  const meta = FORMAT_META[form.format]
  const busy = phase === "uploading"

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, onClose])

  function pickFile(file: File | null) {
    const detected = file ? formatFromExtension(file.name) : null
    setForm((current) => ({
      ...current,
      file,
      format: detected ?? current.format,
      title: current.title || (file ? file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") : ""),
    }))
    setError(null)
  }

  function setFormat(format: ResourceFormat) {
    setForm((current) => ({ ...current, format }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError(null)
    setProgress(0)
    setPhase("uploading")
    const controller = new AbortController()
    abortRef.current = controller

    const result = await uploadResource(form, (pct) => setProgress((prev) => Math.max(prev, pct)), controller.signal)
    abortRef.current = null
    if (result.canceled) {
      setPhase("form")
      notify("Upload canceled.")
      return
    }
    if (result.error) {
      setPhase("form")
      setError(result.error)
      return
    }
    if (result.stored === "device") {
      setPhase("device-only")
      return
    }
    onClose()
  }

  function cancelUpload() {
    abortRef.current?.abort()
  }

  if (phase === "device-only") {
    return (
      <Shell onDismiss={onClose} dismissible>
        <div className="px-6 pb-6 pt-7 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fbf3e6] text-[#8a5a1c]">
            <Icons.Alert className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-display text-[19px] font-bold tracking-[-0.02em] text-ink">
            Saved on this device only
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
            We couldn't reach cloud storage, so <span className="font-medium text-ink">{form.title || "this file"}</span>{" "}
            is listed in your library but its file only lives in this browser. Colleagues and your other
            devices will see the listing without the file.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-muted">
            When your connection is back, delete it and upload it again to share it properly.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-navy text-sm font-semibold text-white transition-colors hover:bg-navy-hover"
          >
            I understand
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell onDismiss={onClose} dismissible={!busy}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">Share a resource</h2>
            <p className="mt-0.5 text-[13px] text-muted">Upload a file or add a link to your library.</p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </div>

        <fieldset disabled={busy} className="space-y-4 px-5 py-5 sm:px-6">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              pickFile(event.dataTransfer.files?.[0] ?? null)
            }}
            className={`rounded-2xl border border-dashed p-4 transition-colors ${
              dragging ? "border-navy bg-navy-soft" : "border-line-strong bg-canvas"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={meta.accept}
              className="sr-only"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />
            {form.file ? (
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-navy shadow-[0_1px_2px_rgba(18,20,28,0.06)]">
                  <FormatMark format={form.format} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{form.file.name}</p>
                  <p className="text-[12px] text-muted">{formatBytes(form.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pickFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted hover:bg-surface hover:text-ink"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 py-3 text-center"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-navy shadow-[0_1px_2px_rgba(18,20,28,0.06)]">
                  <Icons.Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-ink">
                  Drop a file here or <span className="text-navy underline underline-offset-2">browse</span>
                </span>
                <span className="text-[12px] text-muted">
                  PDF, Word, PowerPoint, Excel, video or ZIP · up to {Math.round(MAX_FILE_BYTES / 1_048_576)} MB
                </span>
              </button>
            )}
          </div>

          <label className="block">
            <span className={label}>Or paste a link</span>
            <input
              value={form.sourceUrl}
              onChange={(event) => {
                const sourceUrl = event.target.value
                const detected = inferFormatFromUrl(sourceUrl)
                setForm({ ...form, sourceUrl, format: detected ?? form.format })
                setError(null)
              }}
              className={field}
              placeholder={meta.linkHint}
            />
          </label>

          <label className="block">
            <span className={label}>Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={field}
              placeholder="e.g. Grade 10 Euclidean Geometry: Term 3 worksheet"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className={label}>Subject</span>
              <SubjectPicker value={form.subject} onChange={(subject) => setForm({ ...form, subject })} />
            </div>
            <label className="block">
              <span className={label}>Grade</span>
              <select
                value={form.grade}
                onChange={(event) => setForm({ ...form, grade: event.target.value })}
                className={field}
              >
                {grades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className={label}>Format</span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {FORMAT_ORDER.map((id) => {
                const item = FORMAT_META[id]
                const active = form.format === id
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setFormat(id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-colors ${
                      active
                        ? "border-navy bg-navy-soft text-navy"
                        : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    <FormatMark format={id} className="h-4 w-4" />
                    <span className="text-[11px] font-semibold leading-tight">{item.badge}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[12px] text-muted">{meta.hint}</p>
          </div>

          <div>
            <span className={label}>Type</span>
            <div className="inline-flex rounded-xl border border-line bg-canvas p-1">
              {kinds.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setForm({ ...form, kind: item.id })}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    form.kind === item.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,20,28,0.08)]" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#fbeeec] px-3 py-2.5 text-[13px] text-[#8a3b32]">
              <Icons.Alert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </fieldset>

        {busy && form.file ? (
          <div aria-live="polite" className="border-t border-line px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-ink">
                {progress >= 100 ? "Finishing up…" : `Uploading ${form.file.name}`}
              </span>
              <span className="font-mono font-semibold text-navy">{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-navy transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              {formatBytes((form.file.size * progress) / 100)} of {formatBytes(form.file.size)}. Large files can take a
              few minutes on a slow connection.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
          {busy ? (
            <button
              type="button"
              onClick={cancelUpload}
              className="h-10 rounded-xl border border-line px-4 text-sm font-medium text-ink transition-colors hover:border-line-strong"
            >
              Cancel upload
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl px-4 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:opacity-60"
          >
            <Icons.Upload className="h-4 w-4" />
            {busy ? (form.file ? `Uploading ${progress}%` : "Saving…") : "Share to library"}
          </button>
        </div>
      </form>
    </Shell>
  )
}

function Shell({
  children,
  onDismiss,
  dismissible,
}: {
  children: ReactNode
  onDismiss: () => void
  dismissible: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="animate-fade-in absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
        aria-label="Close"
        disabled={!dismissible}
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-sheet-up relative max-h-[94dvh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-t-3xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.18)] sm:rounded-2xl"
      >
        {children}
      </div>
    </div>
  )
}
