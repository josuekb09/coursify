import FormatMark from "@/components/format-mark"
import Icons from "@/components/icons"
import SubjectPicker from "@/components/subject-picker"
import { grades } from "@/data"
import {
  FORMAT_META,
  FORMAT_ORDER,
  formatFromExtension,
  inferFormatFromUrl,
} from "@/formats"
import { useApp } from "@/store"
import type { ResourceFormat, ResourceKind, UploadInput } from "@/types"
import { useState, type FormEvent } from "react"

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"

const kinds: { id: ResourceKind; label: string }[] = [
  { id: "resource", label: "Resource" },
  { id: "lesson-plan", label: "Lesson plan" },
  { id: "collection", label: "Collection" },
]

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const { uploadResource } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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

  function setFormat(format: ResourceFormat) {
    setForm((current) => ({ ...current, format }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await uploadResource(form)
    setBusy(false)
    if (result) {
      setError(result)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Close upload"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[94vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-t-2xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.18)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">Upload resource</p>
            <p className="font-mono text-[11px] text-muted">File or link · stays in your library</p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink"
            aria-label="Close"
            onClick={onClose}
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 px-5 py-5">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Title
            </span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={field}
              placeholder="Unit title or lesson name"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Subject
              </span>
              <SubjectPicker
                value={form.subject}
                onChange={(subject) => setForm({ ...form, subject })}
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Grade
              </span>
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
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Resource type
            </p>
            <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
              {kinds.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setForm({ ...form, kind: item.id })}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
                    form.kind === item.id ? "bg-navy text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Format
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {FORMAT_ORDER.map((id) => {
                const item = FORMAT_META[id]
                const active = form.format === id
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setFormat(id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-colors ${
                      active
                        ? "border-navy bg-navy-soft text-navy"
                        : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    <FormatMark format={id} className="h-4 w-4" />
                    <span className="text-[11px] font-semibold leading-tight">{item.badge}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted">{meta.hint}</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              File
            </span>
            <input
              type="file"
              accept={meta.accept}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                const detected = file ? formatFromExtension(file.name) : null
                setForm({ ...form, file, format: detected ?? form.format })
                setError(null)
              }}
              className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
            <p className="mt-1.5 font-mono text-[11px] text-muted">
              {form.file ? form.file.name : "Optional if you provide a link. Max 4 MB."}
            </p>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Resource link
            </span>
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

          {error ? <p className="text-sm text-[#8a3b32]">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink hover:border-line-strong"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
          >
            <Icons.Upload className="h-4 w-4" />
            {busy ? "Saving…" : "Save to library"}
          </button>
        </div>
      </form>
    </div>
  )
}
