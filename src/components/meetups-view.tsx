import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import MeetupModal from "@/components/meetup-modal"
import { VERIFIED_ONLY, useApp } from "@/store"
import type { Meetup } from "@/types"
import { durationLabel, templateFor } from "@/meetup-templates"
import {
  googleCalendarUrl,
  isHttpUrl,
  isUpcomingEvent,
  mapsEmbedUrl,
  mapsSearchUrl,
  meetingProvider,
  meetupEnd,
  meetupIcs,
} from "@/utils"
import { useEffect, useMemo, useRef, useState } from "react"

/** Re-renders every `ms` so countdowns stay current. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

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
  const { currentUser, events, authorName, isFounder, notify } = useApp()
  const [filter, setFilter] = useState<EventFilter>("upcoming")
  const [creating, setCreatingRaw] = useState(false)
  const setCreating = (next: boolean) => {
    if (next && !currentUser?.verified && !isFounder) {
      notify(VERIFIED_ONLY)
      window.scrollTo({ top: 0 })
      return
    }
    setCreatingRaw(next)
  }
  const me = currentUser?.id ?? ""
  const needle = query.trim().toLowerCase()
  const [day, setDay] = useState<string | null>(null)

  // The next two weeks, with how many upcoming meetups fall on each day.
  const days = useMemo(() => {
    const perDay = new Map<string, number>()
    for (const event of events) {
      if (!isUpcomingEvent(event)) continue
      const key = dayKey(new Date(event.startsAt))
      perDay.set(key, (perDay.get(key) ?? 0) + 1)
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const key = dayKey(date)
      return { key, date, count: perDay.get(key) ?? 0, today: i === 0 }
    })
  }, [events])

  const counts = useMemo(() => {
    const upcoming = events.filter((event) => isUpcomingEvent(event))
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
      if (day && dayKey(new Date(event.startsAt)) !== day) return false
      if (filter === "hosting") return event.hostId === me
      if (!isUpcomingEvent(event)) return false
      if (filter === "in-person" || filter === "online") return event.format === filter
      if (filter === "going") return event.rsvpIds.includes(me) && event.hostId !== me
      return true
    })
    if (filter === "hosting") {
      const upcoming = list.filter((event) => isUpcomingEvent(event))
      const past = list.filter((event) => !isUpcomingEvent(event)).reverse()
      return [...upcoming, ...past]
    }
    return list
  }, [authorName, day, events, filter, me, needle])

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

      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div className="flex gap-1.5" role="group" aria-label="Pick a day">
          {days.map((item) => {
            const active = day === item.key
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => setDay(active ? null : item.key)}
                aria-pressed={active}
                className={`flex w-[52px] shrink-0 flex-col items-center rounded-xl border py-2 transition-colors ${
                  active
                    ? "border-navy bg-navy text-white"
                    : item.count
                      ? "border-line bg-surface text-ink hover:border-line-strong"
                      : "border-transparent text-muted hover:bg-surface"
                }`}
              >
                <span className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${active ? "text-white/70" : "text-muted"}`}>
                  {item.today ? "Today" : item.date.toLocaleDateString("en-ZA", { weekday: "short" })}
                </span>
                <span className="mt-0.5 font-display text-[18px] font-bold leading-none tabular-nums">{item.date.getDate()}</span>
                <span className="mt-1.5 flex h-1.5 gap-0.5" aria-label={`${item.count} meetups`}>
                  {Array.from({ length: Math.min(3, item.count) }, (_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-navy"}`} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {day ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
          Showing {days.find((item) => item.key === day)?.date.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
          <button type="button" onClick={() => setDay(null)} className="font-semibold text-navy hover:underline">
            Show all dates
          </button>
        </p>
      ) : null}

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

function liveStatus(event: Meetup, now: number) {
  const start = new Date(event.startsAt).getTime()
  const end = meetupEnd(event).getTime()
  if (now >= start && now < end) return { label: "Live now", tone: "live" as const }
  if (now >= end) return { label: "Ended", tone: "past" as const }
  const diff = start - now
  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) return { label: `Starts in ${Math.max(1, minutes)} min`, tone: "soon" as const }
  const startDay = new Date(start)
  startDay.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const days = Math.round((startDay.getTime() - today.getTime()) / 86_400_000)
  if (days === 0) {
    const hours = Math.floor(minutes / 60)
    return { label: `Starts in ${hours} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim(), tone: "soon" as const }
  }
  if (days === 1) return { label: "Tomorrow", tone: "later" as const }
  if (days < 7) return { label: `In ${days} days`, tone: "later" as const }
  return null
}

const timeFormat: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }

/** Google Calendar, or an .ics file for Apple Calendar and Outlook. */
function CalendarMenu({ event }: { event: Meetup }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [open])

  function downloadIcs() {
    const blob = new Blob([meetupIcs(event)], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${event.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "meetup"}.ics`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setOpen(false)
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink hover:bg-canvas"
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition-colors hover:border-line-strong"
      >
        <Icons.CalendarPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Add to calendar</span>
        <span className="sm:hidden">Calendar</span>
      </button>
      {open ? (
        <div role="menu" className="animate-pop-in absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-line bg-surface p-1 shadow-[0_12px_32px_rgba(18,20,28,0.14)]">
          <a
            role="menuitem"
            href={googleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className={item}
          >
            <Icons.Calendar className="h-4 w-4 text-navy" />
            Google Calendar
            <Icons.ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted" />
          </a>
          <button type="button" role="menuitem" onClick={downloadIcs} className={item}>
            <Icons.Download className="h-4 w-4 text-navy" />
            Apple Calendar or Outlook
          </button>
        </div>
      ) : null}
    </div>
  )
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
  const now = useNow()
  const upcoming = isUpcomingEvent(event)
  const start = new Date(event.startsAt)
  const end = meetupEnd(event)
  const status = liveStatus(event, now)
  const template = templateFor(event.kind)
  const seatsLeft = event.capacity ? Math.max(0, event.capacity - event.rsvpIds.length) : null
  const full = seatsLeft === 0
  const [agendaOpen, setAgendaOpen] = useState(false)
  const attendees = event.rsvpIds.map((id) => educatorById(id)).filter((item) => item !== undefined)

  async function handleRsvp() {
    if (busy || (full && !going)) return
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
            {template ? (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11.5px] font-semibold text-ink">{template.name}</span>
            ) : null}
            {status ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                  status.tone === "live"
                    ? "bg-[#e7f5ee] text-online"
                    : status.tone === "soon"
                      ? "bg-warn-soft text-warn"
                      : status.tone === "past"
                        ? "bg-canvas text-muted"
                        : "bg-canvas text-ink"
                }`}
              >
                {status.tone === "live" ? (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-online opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-online" />
                  </span>
                ) : null}
                {status.label}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 font-display text-[18px] font-bold leading-snug tracking-[-0.02em] text-ink">
            {event.title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
            <Icons.Clock className="h-3.5 w-3.5 shrink-0" />
            {start.toLocaleTimeString("en-ZA", timeFormat)}–{end.toLocaleTimeString("en-ZA", timeFormat)}
            <span aria-hidden="true">·</span>
            {durationLabel(Math.round((end.getTime() - start.getTime()) / 60_000))}
          </p>
        </div>
      </div>

      {event.description ? (
        <p className="line-clamp-3 px-5 text-[14px] leading-relaxed text-ink/80">{event.description}</p>
      ) : null}

      {event.agenda?.length ? (
        <div className="mx-5 mt-3 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setAgendaOpen((value) => !value)}
            aria-expanded={agendaOpen}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-semibold text-ink"
          >
            <Icons.ListChecks className="h-4 w-4 text-navy" />
            Agenda
            <span className="font-normal text-muted">· {event.agenda.length} items</span>
            <Icons.Chevron className={`ml-auto h-4 w-4 text-muted transition-transform ${agendaOpen ? "rotate-180" : ""}`} />
          </button>
          {agendaOpen ? (
            <ol className="animate-fade-in space-y-1.5 border-t border-line px-3.5 py-3">
              {event.agenda.map((item, index) => (
                <li key={index} className="flex gap-2.5 text-[13px] leading-snug text-ink">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-soft text-[11px] font-bold text-navy">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
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
          <span className="text-[12.5px] text-muted">
            {event.rsvpIds.length} going
            {event.capacity ? (
              <span className={full ? "font-semibold text-[#8a3b32]" : seatsLeft !== null && seatsLeft <= 3 ? "font-semibold text-warn" : ""}>
                {" · "}
                {full ? "Full" : `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left`}
              </span>
            ) : null}
          </span>
        </div>
        {event.capacity ? (
          <div className="h-1 w-full overflow-hidden rounded-full bg-canvas" aria-hidden="true">
            <div
              className={`h-full rounded-full transition-[width] ${full ? "bg-[#8a3b32]" : "bg-navy"}`}
              style={{ width: `${Math.min(100, (event.rsvpIds.length / event.capacity) * 100)}%` }}
            />
          </div>
        ) : null}
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
                disabled={busy || (full && !going)}
                onClick={() => void handleRsvp()}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                  going ? "border border-line bg-surface text-ink hover:border-line-strong" : "bg-navy text-white hover:bg-navy-hover"
                }`}
              >
                {going ? <Icons.Check className="h-4 w-4 text-online" /> : null}
                {busy ? "Saving…" : going ? "Going" : full ? "Full" : "RSVP"}
              </button>
            ) : (
              <span className="text-[13px] text-muted">This meetup has ended</span>
            )}
            {online && upcoming && (going || isHost) && event.meetingUrl && isHttpUrl(event.meetingUrl) ? (
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
            {upcoming && (going || isHost) ? <CalendarMenu event={event} /> : null}
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
