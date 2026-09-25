import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import MeetupModal from "@/components/meetup-modal"
import { useApp } from "@/store"
import type { Meetup } from "@/types"
import { isUpcomingEvent, mapsEmbedUrl, mapsSearchUrl, meetingProvider } from "@/utils"
import { useMemo, useState } from "react"

type EventFilter = "upcoming" | "in-person" | "online" | "going" | "hosting"

const filters: { id: EventFilter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "in-person", label: "In person" },
  { id: "online", label: "Online" },
  { id: "going", label: "Going" },
  { id: "hosting", label: "Hosting" },
]

const emptyCopy: Record<EventFilter, { title: string; body: string }> = {
  upcoming: { title: "Nothing on the calendar yet", body: "Host the first session: a moderation meeting, a subject cluster, or coffee after school." },
  "in-person": { title: "No in-person meetups coming up", body: "Invite colleagues to your school, a district office or a café nearby." },
  online: { title: "No online meetups coming up", body: "A 30-minute Google Meet is often all it takes to plan a term together." },
  going: { title: "You haven't RSVP'd to anything yet", body: "Meetups you join show up here, with the joining link for online sessions." },
  hosting: { title: "You're not hosting any meetups", body: "Meetups you create appear here, including ones that have already happened." },
}

export default function MeetupsView({ query, onAuthor }: { query: string; onAuthor: (id: string) => void }) {
  const { currentUser, events, authorName } = useApp()
  const [filter, setFilter] = useState<EventFilter>("upcoming")
  const [creating, setCreating] = useState(false)
  const me = currentUser?.id ?? ""
  const needle = query.trim().toLowerCase()

  const counts = useMemo(() => {
    const upcoming = events.filter((event) => isUpcomingEvent(event.startsAt))
    return {
      upcoming: upcoming.length,
      "in-person": upcoming.filter((event) => event.format === "in-person").length,
      online: upcoming.filter((event) => event.format === "online").length,
      going: upcoming.filter((event) => event.rsvpIds.includes(me) && event.hostId !== me).length,
      hosting: events.filter((event) => event.hostId === me).length,
    } satisfies Record<EventFilter, number>
  }, [events, me])

  const filtered = useMemo(() => {
    const list = events.filter((event) => {
      if (needle) {
        const hay = `${event.title} ${event.description} ${event.location ?? ""} ${authorName(event.hostId)}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      // Hosting is the only view that includes past meetups, so hosts can see what they ran.
      if (filter === "hosting") return event.hostId === me
      if (!isUpcomingEvent(event.startsAt)) return false
      if (filter === "in-person" || filter === "online") return event.format === filter
      if (filter === "going") return event.rsvpIds.includes(me) && event.hostId !== me
      return true
    })
    if (filter === "hosting") {
      const upcoming = list.filter((event) => isUpcomingEvent(event.startsAt))
      const past = list.filter((event) => !isUpcomingEvent(event.startsAt)).reverse()
      return [...upcoming, ...past]
    }
    return list
  }, [authorName, events, filter, me, needle])

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.03em] text-ink">Meetups</h1>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">
            Subject clusters, moderation sessions and after-school catch-ups, in person or online.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-hover"
        >
          <Icons.Plus className="h-4 w-4" />
          Host a meetup
        </button>
      </div>

      <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
          {filters.map((item) => {
            const active = filter === item.id
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors ${
                  active ? "bg-navy text-white" : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {item.label}
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums ${
                    active ? "bg-white/15 text-white" : "bg-canvas text-muted"
                  }`}
                >
                  {counts[item.id]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((event, index) => (
            <div key={event.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
              <MeetupCard event={event} onAuthor={onAuthor} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-navy-soft text-navy">
            <Icons.Calendar className="h-6 w-6" />
          </span>
          <p className="mt-4 font-display text-[17px] font-bold text-ink">
            {needle ? "No meetups match your search" : emptyCopy[filter].title}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-[14px] leading-relaxed text-muted">
            {needle ? `Nothing matches “${query.trim()}” in this view.` : emptyCopy[filter].body}
          </p>
          {!needle ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold text-ink transition-colors hover:border-line-strong"
            >
              <Icons.Plus className="h-4 w-4" />
              Host a meetup
            </button>
          ) : null}
        </div>
      )}

      {creating ? <MeetupModal onClose={() => setCreating(false)} /> : null}
    </main>
  )
}

function relativeLabel(iso: string) {
  const start = new Date(iso)
  const now = new Date()
  const diff = start.getTime() - now.getTime()
  if (diff <= 0 && diff > -60 * 60_000) return "Happening now"
  if (diff <= 0) return "Ended"
  const dayMs = 86_400_000
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const days = Math.round((startDay - today) / dayMs)
  if (days === 0) return diff < 60 * 60_000 ? `In ${Math.max(1, Math.round(diff / 60_000))} min` : "Today"
  if (days === 1) return "Tomorrow"
  if (days < 7) return `In ${days} days`
  return ""
}

function MeetupCard({ event, onAuthor }: { event: Meetup; onAuthor: (id: string) => void }) {
  const { currentUser, educatorById, authorName, toggleEventRsvp, deleteMeetup, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const host = educatorById(event.hostId)
  const me = currentUser?.id ?? ""
  const isHost = me === event.hostId
  const going = event.rsvpIds.includes(me)
  const online = event.format === "online"
  const upcoming = isUpcomingEvent(event.startsAt)
  const start = new Date(event.startsAt)
  const relative = relativeLabel(event.startsAt)
  const attendees = event.rsvpIds.map((id) => educatorById(id)).filter((item) => item !== undefined)

  async function handleRsvp() {
    if (busy) return
    setBusy(true)
    try {
      await toggleEventRsvp(event.id)
      notify(going ? "You're no longer going." : `You're going to ${event.title}.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update your RSVP.")
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (busy) return
    setBusy(true)
    try {
      await deleteMeetup(event.id)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not cancel this meetup.")
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-[0_8px_30px_rgba(18,20,28,0.06)] ${
        upcoming ? "" : "opacity-75"
      }`}
    >
      <div className="flex gap-4 p-5">
        <div
          className={`flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-xl border text-center ${
            online ? "border-[#d5e2ea] bg-[#eef3f6]" : "border-[#dde3ef] bg-navy-soft"
          }`}
        >
          <span
            className={`w-full py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white ${
              online ? "bg-[#3a5a6b]" : "bg-navy"
            }`}
          >
            {start.toLocaleDateString("en-ZA", { month: "short" })}
          </span>
          <span className="pt-1 font-display text-[26px] font-bold leading-none text-ink">{start.getDate()}</span>
          <span className="pb-2 pt-0.5 text-[11px] font-medium text-muted">
            {start.toLocaleDateString("en-ZA", { weekday: "short" })}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                online ? "bg-[#eef3f6] text-[#3a5a6b]" : "bg-navy-soft text-navy"
              }`}
            >
              {online ? <Icons.Video className="h-3.5 w-3.5" /> : <Icons.Pin className="h-3.5 w-3.5" />}
              {online ? "Online" : "In person"}
            </span>
            {relative ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                  relative === "Happening now"
                    ? "bg-[#e7f5ee] text-online"
                    : relative === "Ended"
                      ? "bg-canvas text-muted"
                      : "bg-canvas text-ink"
                }`}
              >
                {relative}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 font-display text-[18px] font-bold leading-snug tracking-[-0.02em] text-ink">
            {event.title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
            <Icons.Clock className="h-3.5 w-3.5 shrink-0" />
            {start.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
            <span aria-hidden="true">·</span>
            {start.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {event.description ? (
        <p className="line-clamp-3 px-5 text-[14px] leading-relaxed text-ink/80">{event.description}</p>
      ) : null}

      <div className="mt-4 px-5">
        {online ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div
              className="relative grid h-36 place-items-center overflow-hidden bg-[#eef3f6]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(58,90,107,0.10) 0, transparent 45%), radial-gradient(circle at 80% 90%, rgba(26,43,74,0.10) 0, transparent 45%)",
              }}
            >
              <div className="flex flex-col items-center gap-2 text-[#3a5a6b]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface shadow-[0_4px_14px_rgba(18,20,28,0.08)]">
                  <Icons.Video className="h-6 w-6" />
                </span>
                <span className="text-[13px] font-semibold">
                  {event.meetingUrl ? meetingProvider(event.meetingUrl) : "Online"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-line px-3.5 py-2.5 text-[13px]">
              <Icons.Link className="h-4 w-4 shrink-0 text-[#3a5a6b]" />
              <span className={`min-w-0 flex-1 truncate ${going || isHost ? "font-medium text-ink" : "text-muted"}`}>
                {going || isHost ? event.meetingUrl : "RSVP to get the joining link"}
              </span>
            </div>
          </div>
        ) : event.location ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <iframe
              title={`Map of ${event.location}`}
              src={mapsEmbedUrl(event.location)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-36 w-full border-0 bg-canvas"
            />
            <a
              href={mapsSearchUrl(event.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border-t border-line px-3.5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
            >
              <Icons.Pin className="h-4 w-4 shrink-0 text-navy" />
              <span className="min-w-0 flex-1 truncate">{event.location}</span>
              <Icons.ArrowUpRight className="h-4 w-4 shrink-0 text-muted" />
            </a>
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3 px-5 pb-5 pt-4">
        <button type="button" onClick={() => onAuthor(event.hostId)} className="flex min-w-0 items-center gap-2 text-left">
          <Avatar educator={host ?? { name: authorName(event.hostId), initials: "?" }} size={28} rounded="rounded-full" />
          <span className="min-w-0 text-[12.5px] leading-tight">
            <span className="block text-muted">Hosted by</span>
            <span className="block truncate font-semibold text-ink">{isHost ? "You" : (host?.name ?? authorName(event.hostId))}</span>
          </span>
        </button>

        <div className="flex items-center gap-2" title={`${event.rsvpIds.length} going`}>
          <div className="flex -space-x-2">
            {attendees.slice(0, 4).map((person) => (
              <Avatar key={person.id} educator={person} size={24} rounded="rounded-full" className="ring-2 ring-surface" />
            ))}
          </div>
          <span className="text-[12.5px] text-muted">{event.rsvpIds.length} going</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-canvas/50 px-5 py-3">
        {confirming ? (
          <div className="animate-fade-in flex w-full flex-wrap items-center gap-2">
            <p className="mr-auto text-[13px] text-ink">Cancel this meetup for everyone?</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="h-9 rounded-lg px-3 text-[13px] font-medium text-muted hover:text-ink"
            >
              Keep it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCancel()}
              className="h-9 rounded-lg bg-[#8a3b32] px-3.5 text-[13px] font-semibold text-white hover:bg-[#74302a] disabled:opacity-60"
            >
              {busy ? "Cancelling…" : "Cancel meetup"}
            </button>
          </div>
        ) : (
          <>
            {isHost ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-soft px-3 text-[13px] font-semibold text-navy">
                <Icons.Check className="h-4 w-4" />
                You're hosting
              </span>
            ) : upcoming ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRsvp()}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                  going ? "border border-line bg-surface text-ink hover:border-line-strong" : "bg-navy text-white hover:bg-navy-hover"
                }`}
              >
                {going ? <Icons.Check className="h-4 w-4 text-online" /> : null}
                {busy ? "Saving…" : going ? "Going" : "RSVP"}
              </button>
            ) : (
              <span className="text-[13px] text-muted">This meetup has ended</span>
            )}
            {online && upcoming && (going || isHost) && event.meetingUrl ? (
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-navy px-3.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy-soft"
              >
                Join
                <Icons.ArrowUpRight className="h-4 w-4" />
              </a>
            ) : null}
            {isHost ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="ml-auto h-9 rounded-lg px-3 text-[13px] font-medium text-muted transition-colors hover:text-[#8a3b32]"
              >
                {upcoming ? "Cancel meetup" : "Remove"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  )
}
