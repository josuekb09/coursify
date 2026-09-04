import Icons from "@/components/icons"
import { mapsEmbedUrl, mapsSearchUrl } from "@/utils"
import { useApp } from "@/store"
import type { EventFormat, MeetupInput } from "@/types"
import { useMemo, useState, type FormEvent } from "react"

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"

function defaultStartsAt() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(16, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function MeetupModal({ onClose }: { onClose: () => void }) {
  const { createMeetup, notify } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<MeetupInput>({
    title: "",
    description: "",
    format: "in-person",
    startsAt: defaultStartsAt(),
    location: "",
    meetingUrl: "",
  })

  const mapPreview = useMemo(() => {
    const location = form.location?.trim() ?? ""
    if (form.format !== "in-person" || location.length < 4) return null
    return {
      embed: mapsEmbedUrl(location),
      search: mapsSearchUrl(location),
    }
  }, [form.format, form.location])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await createMeetup(form)
      if (result) {
        setError(result)
        notify(result)
        return
      }
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not publish this meetup. Please try again."
      setError(message)
      notify(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Close meetup form"
        disabled={busy}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[94vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-t-2xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.18)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">Host a meetup</p>
            <p className="font-mono text-[11px] text-muted">In person or online · colleagues can RSVP</p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink disabled:opacity-50"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Format
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["in-person", "In person"],
                  ["online", "Online"],
                ] as [EventFormat, string][]
              ).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setForm({ ...form, format: id })}
                  className={`rounded-lg border px-3 py-2.5 text-[13px] font-semibold ${
                    form.format === id
                      ? "border-navy bg-navy-soft text-navy"
                      : "border-line bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Title
            </span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={field}
              placeholder="Faculty curriculum huddle"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Date and time
            </span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={4}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-navy"
              placeholder="What will colleagues take away from this session?"
            />
          </label>

          {form.format === "in-person" ? (
            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Venue / address
              </span>
              <input
                value={form.location ?? ""}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                className={field}
                placeholder="Library, Room 204, or street address"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                Conference link
              </span>
              <input
                value={form.meetingUrl ?? ""}
                onChange={(event) => setForm({ ...form, meetingUrl: event.target.value })}
                className={field}
                placeholder="https://meet.google.com/…"
              />
            </label>
          )}

          {mapPreview ? (
            <div className="overflow-hidden rounded-xl border border-line bg-canvas">
              <iframe
                title="Venue map preview"
                src={mapPreview.embed}
                className="h-40 w-full border-0"
              />
              <a
                href={mapPreview.search}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-t border-line px-3 py-2 text-[12px] font-semibold text-navy hover:bg-navy-soft"
              >
                Open in Maps
              </a>
            </div>
          ) : null}

          {error ? <p className="text-sm text-[#8a3b32]">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
          >
            {busy ? "Publishing…" : "Publish meetup"}
          </button>
        </div>
      </form>
    </div>
  )
}
