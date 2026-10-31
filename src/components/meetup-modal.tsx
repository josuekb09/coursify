import Icons from "@/components/icons"
import { mapsEmbedUrl, mapsSearchUrl, meetingProvider, normalizeMeetingUrl } from "@/utils"
import { useApp } from "@/store"
import { DURATIONS, MEETUP_TEMPLATES, durationLabel, type MeetupTemplate } from "@/meetup-templates"
import type { EventFormat, MeetupInput } from "@/types"
import { useEffect, useState, type FormEvent } from "react"

const field =
  "h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none transition-shadow focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.10)]"
const label = "mb-1.5 block text-[12px] font-semibold text-ink"

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultStartsAt() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(15, 0, 0, 0)
  return toLocalInput(date)
}

const formats: { id: EventFormat; title: string; body: string }[] = [
  { id: "in-person", title: "In person", body: "At a school, office or café" },
  { id: "online", title: "Online", body: "Google Meet, Zoom or Teams" },
]

export default function MeetupModal({ onClose }: { onClose: () => void }) {
  const { createMeetup } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<MeetupInput>({
    title: "",
    description: "",
    format: "in-person",
    startsAt: defaultStartsAt(),
    location: "",
    meetingUrl: "",
    durationMinutes: 60,
    capacity: null,
    agenda: [],
  })
  const [newItem, setNewItem] = useState("")

  // Picking the active template again clears what it filled in.
  function applyTemplate(template: MeetupTemplate) {
    setForm((current) => {
      const off = current.kind === template.kind
      return {
        ...current,
        kind: off ? undefined : template.kind,
        title: off ? "" : template.title,
        description: off ? "" : template.description,
        agenda: off ? [] : template.agenda,
        durationMinutes: template.durationMinutes,
        format: template.format,
      }
    })
    setError(null)
  }

  function addAgendaItem() {
    const item = newItem.trim()
    if (!item || (form.agenda?.length ?? 0) >= 8) return
    setForm({ ...form, agenda: [...(form.agenda ?? []), item.slice(0, 120)] })
    setNewItem("")
  }
  // The map iframe reloads whenever its URL changes, so only update it once typing pauses.
  const [mapQuery, setMapQuery] = useState("")

  useEffect(() => {
    const location = form.location?.trim() ?? ""
    const timer = window.setTimeout(() => setMapQuery(location.length >= 4 ? location : ""), 600)
    return () => window.clearTimeout(timer)
  }, [form.location])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, onClose])

  const meetingUrl = normalizeMeetingUrl(form.meetingUrl ?? "")
  const urlTyped = Boolean(form.meetingUrl?.trim())

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await createMeetup(form)
    setBusy(false)
    if (result) {
      setError(result)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="animate-fade-in absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
        aria-label="Close"
        disabled={busy}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meetup-modal-title"
        className="animate-sheet-up relative max-h-[94dvh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-t-3xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.18)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="meetup-modal-title" className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">
              Host a meetup
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">Colleagues can RSVP as soon as it's published.</p>
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

        <fieldset disabled={busy} className="min-w-0 space-y-4 px-5 py-5 sm:px-6">
          <div>
            <span className={label}>Start from a template</span>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
              {MEETUP_TEMPLATES.map((template) => {
                const active = form.kind === template.kind
                return (
                  <button
                    type="button"
                    key={template.kind}
                    onClick={() => applyTemplate(template)}
                    aria-pressed={active}
                    title={template.blurb}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      active ? "border-navy bg-navy text-white" : "border-line text-ink hover:border-line-strong"
                    }`}
                  >
                    {template.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {formats.map((item) => {
              const active = form.format === item.id
              const Icon = item.id === "online" ? Icons.Video : Icons.Pin
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setForm({ ...form, format: item.id })
                    setError(null)
                  }}
                  aria-pressed={active}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    active ? "border-navy bg-navy-soft" : "border-line hover:border-line-strong"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      active ? "bg-navy text-white" : "bg-canvas text-muted"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">{item.title}</span>
                    <span className="block text-[12px] leading-snug text-muted">{item.body}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <label className="block">
            <span className={label}>Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={field}
              maxLength={160}
              placeholder="e.g. Grade 12 Physical Sciences moderation prep"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <label className="block">
              <span className={label}>Date and time</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                min={toLocalInput(new Date())}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Length</span>
              <select
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}
                className={field}
              >
                {DURATIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {durationLabel(minutes)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.format === "in-person" ? (
            <div>
              <label className="block">
                <span className={label}>Venue</span>
                <input
                  value={form.location ?? ""}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  className={field}
                  placeholder="School name, street address or suburb"
                />
              </label>
              <div className="mt-2 overflow-hidden rounded-xl border border-line bg-canvas">
                {mapQuery ? (
                  <>
                    <iframe
                      key={mapQuery}
                      title="Venue map preview"
                      src={mapsEmbedUrl(mapQuery)}
                      loading="lazy"
                      className="animate-fade-in h-40 w-full border-0"
                    />
                    <a
                      href={mapsSearchUrl(mapQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2 text-[12.5px] font-medium text-navy hover:bg-navy-soft"
                    >
                      Check the pin in Google Maps
                      <Icons.ArrowUpRight className="h-4 w-4" />
                    </a>
                  </>
                ) : (
                  <p className="flex h-24 items-center justify-center gap-2 px-4 text-center text-[12.5px] text-muted">
                    <Icons.Pin className="h-4 w-4" />
                    A map preview appears once you type the venue.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <label className="block">
              <span className={label}>Meeting link</span>
              <input
                value={form.meetingUrl ?? ""}
                onChange={(event) => setForm({ ...form, meetingUrl: event.target.value })}
                className={`${field} ${urlTyped && !meetingUrl ? "border-[#c9786f]" : ""}`}
                inputMode="url"
                placeholder="https://meet.google.com/abc-defg-hij"
              />
              <span className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${urlTyped && !meetingUrl ? "text-[#8a3b32]" : "text-muted"}`}>
                {!urlTyped ? (
                  "Only colleagues who RSVP will see this link."
                ) : meetingUrl ? (
                  <>
                    <Icons.Check className="h-3.5 w-3.5 text-online" />
                    {meetingProvider(meetingUrl)} link
                  </>
                ) : (
                  "That doesn't look like a meeting link yet."
                )}
              </span>
            </label>
          )}

          <label className="block">
            <span className={label}>What's it about?</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
              maxLength={1200}
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition-shadow focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.10)]"
              placeholder="Share the agenda and what people should bring, e.g. marked scripts, the ATP, or a question for the group."
            />
          </label>

          <div>
            <span className={label}>
              Agenda <span className="font-normal text-muted">(optional)</span>
            </span>
            {form.agenda?.length ? (
              <ol className="mb-2 space-y-1.5">
                {form.agenda.map((item, index) => (
                  <li key={`${index}-${item}`} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-[13.5px] text-ink">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-soft text-[11px] font-bold text-navy">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, agenda: form.agenda?.filter((_, i) => i !== index) })}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink"
                      aria-label={`Remove ${item}`}
                    >
                      <Icons.Close className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
            {(form.agenda?.length ?? 0) < 8 ? (
              <div className="flex gap-2">
                <input
                  value={newItem}
                  onChange={(event) => setNewItem(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addAgendaItem()
                    }
                  }}
                  maxLength={120}
                  className={field}
                  placeholder={form.agenda?.length ? "Add another item" : "e.g. Memo discussion"}
                />
                <button
                  type="button"
                  onClick={addAgendaItem}
                  disabled={!newItem.trim()}
                  className="h-11 shrink-0 rounded-xl border border-line px-3.5 text-[13px] font-semibold text-ink hover:border-line-strong disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-line px-3.5 py-3">
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink">Limit seats</span>
              <span className="block text-[12px] text-muted">For a classroom or a small venue. Includes you.</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={2}
              max={1000}
              value={form.capacity ?? ""}
              onChange={(event) => setForm({ ...form, capacity: event.target.value ? Number(event.target.value) : null })}
              placeholder="No limit"
              aria-label="Seats"
              className="h-10 w-28 shrink-0 rounded-xl border border-line bg-canvas px-3 text-right text-sm text-ink outline-none focus:border-navy focus:bg-surface"
            />
          </label>

          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#fbeeec] px-3 py-2.5 text-[13px] text-[#8a3b32]">
              <Icons.Alert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-xl px-4 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:opacity-60"
          >
            <Icons.Calendar className="h-4 w-4" />
            {busy ? "Publishing…" : "Publish meetup"}
          </button>
        </div>
      </form>
    </div>
  )
}
