import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import MeetupModal from "@/components/meetup-modal"
import { useApp } from "@/store"
import type { Meetup } from "@/types"
import { formatEventWhen, isUpcomingEvent, mapsEmbedUrl, mapsSearchUrl } from "@/utils"
import { useMemo, useState } from "react"

type EventFilter = "upcoming" | "online" | "in-person" | "going" | "hosting"

export default function MeetupsView({
  query,
  onAuthor,
}: {
  query: string
  onAuthor: (id: string) => void
}) {
  const { currentUser, events, authorName } = useApp()
  const [filter, setFilter] = useState<EventFilter>("upcoming")
  const [creating, setCreating] = useState(false)

  const needle = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (needle) {
        const host = authorName(event.hostId).toLowerCase()
        const hay = `${event.title} ${event.description} ${event.location ?? ""} ${host}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (filter === "upcoming") return isUpcomingEvent(event.startsAt)
      if (filter === "online" || filter === "in-person") return event.format === filter
      if (filter === "going") return Boolean(currentUser && event.rsvpIds.includes(currentUser.id))
      if (filter === "hosting") return currentUser?.id === event.hostId
      return true
    })
  }, [authorName, currentUser, events, filter, needle])

  const filters: { id: EventFilter; label: string }[] = [
    { id: "upcoming", label: "Upcoming" },
    { id: "in-person", label: "In person" },
    { id: "online", label: "Online" },
    { id: "going", label: "Going" },
    { id: "hosting", label: "Hosting" },
  ]

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-[-0.03em] text-ink">Meetups</h1>
          <p className="mt-1 text-sm text-muted">
            Plan in-person and online sessions with colleagues. RSVP to join, then connect outside the classroom.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-hover"
        >
          <Icons.Plus className="h-4 w-4" />
          Host a meetup
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {filters.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
              filter === item.id
                ? "border-navy bg-navy text-white"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filtered.map((event) => (
          <MeetupCard
            key={event.id}
            event={event}
            onAuthor={onAuthor}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">
          {needle
            ? "No meetups match that search."
            : "No meetups in this view yet. Host the first session for your faculty."}
        </p>
      ) : null}

      {creating ? <MeetupModal onClose={() => setCreating(false)} /> : null}
    </main>
  )
}

function MeetupCard({
  event,
  onAuthor,
}: {
  event: Meetup
  onAuthor: (id: string) => void
}) {
  const { currentUser, educatorById, authorName, toggleEventRsvp, deleteMeetup, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const host = educatorById(event.hostId)
  const going = Boolean(currentUser && event.rsvpIds.includes(currentUser.id))
  const isHost = currentUser?.id === event.hostId
  const online = event.format === "online"

  async function handleRsvp() {
    if (busy) return
    setBusy(true)
    try {
      await toggleEventRsvp(event.id)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update your RSVP.")
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (busy) return
    if (!window.confirm(`Cancel “${event.title}”? Colleagues will no longer see this meetup.`)) return
    setBusy(true)
    try {
      await deleteMeetup(event.id)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not cancel this meetup.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-navy">
            {online ? <Icons.Film className="h-3.5 w-3.5" /> : <Icons.Pin className="h-3.5 w-3.5" />}
            {online ? "Online" : "In person"}
          </span>
          <h2 className="mt-2 font-display text-lg font-bold tracking-[-0.02em] text-ink">{event.title}</h2>
          <p className="mt-1 font-mono text-[12px] text-muted">{formatEventWhen(event.startsAt)}</p>
        </div>
        <button type="button" onClick={() => onAuthor(event.hostId)} className="shrink-0 text-left">
          <Avatar
            educator={host ?? { name: authorName(event.hostId), initials: "E" }}
            size={40}
            rounded="rounded-lg"
          />
        </button>
      </div>

      <div className="flex-1 space-y-3 px-5 py-4">
        <p className="text-[14px] leading-relaxed text-ink/80">{event.description}</p>
        <p className="text-[13px] text-muted">
          Hosted by{" "}
          <button type="button" onClick={() => onAuthor(event.hostId)} className="font-semibold text-navy">
            {host?.name ?? authorName(event.hostId)}
          </button>
          {host?.school ? ` · ${host.school}` : ""}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {event.rsvpIds.length} {event.rsvpIds.length === 1 ? "colleague going" : "colleagues going"}
        </p>

        {!online && event.location ? (
          <div className="overflow-hidden rounded-lg border border-line">
            <iframe title={`${event.title} map`} src={mapsEmbedUrl(event.location)} className="h-36 w-full border-0" />
            <a
              href={mapsSearchUrl(event.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-navy hover:bg-navy-soft"
            >
              <Icons.Pin className="h-3.5 w-3.5" />
              {event.location}
            </a>
          </div>
        ) : null}

        {online && event.meetingUrl && going ? (
          <p className="truncate font-mono text-[12px] text-navy">{event.meetingUrl}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRsvp()}
          className={`min-h-10 rounded-lg px-3.5 py-2 text-[13px] font-semibold disabled:opacity-60 ${
            going
              ? "border border-line text-ink hover:border-line-strong"
              : "bg-navy text-white hover:bg-navy-hover"
          }`}
        >
          {busy ? "Updating…" : going ? "Going" : "RSVP"}
        </button>
        {online && going && event.meetingUrl ? (
          <a
            href={event.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-navy px-3.5 py-2 text-[13px] font-semibold text-navy hover:bg-navy-soft"
          >
            Join event
          </a>
        ) : null}
        {isHost ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCancel()}
            className="ml-auto min-h-10 rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50"
          >
            Cancel event
          </button>
        ) : null}
      </div>
    </article>
  )
}
