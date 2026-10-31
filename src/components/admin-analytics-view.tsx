import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import { FOUNDER_EMAIL, isFounderEmail } from "@/security"
import { useApp } from "@/store"
import { formatBytes } from "@/utils"
import { useMemo, useState } from "react"
import type { VerificationRequest } from "@/types"

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? "Recently"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
}

export default function AdminAnalyticsView() {
  const { currentUser, educators, events, isFounder, resources } = useApp()

  const authorized = isFounder && isFounderEmail(currentUser?.email ?? "")

  const stats = useMemo(() => {
    const totalEducators = educators.length
    const totalResources = resources.length
    const now = Date.now()
    const activeMeetups = events.filter((e) => new Date(e.startsAt).valueOf() >= now)
    const totalRsvps = events.reduce((sum, e) => sum + (e.rsvpIds?.length ?? 0), 0)

    const highSchoolCount = educators.filter((e) => e.institutionLevel === "high-school").length
    const universityCount = educators.filter((e) => e.institutionLevel === "university").length
    const verifiedCount = educators.filter((e) => e.verified).length

    const formatCounts = {
      slides: resources.filter((r) => r.format === "slides").length,
      document: resources.filter((r) => r.format === "document").length,
      video: resources.filter((r) => r.format === "video").length,
      code: resources.filter((r) => r.format === "code").length,
      spreadsheet: resources.filter((r) => r.format === "spreadsheet").length,
    }

    const totalDownloads = resources.reduce((sum, r) => sum + (r.downloads || 0), 0)
    const totalSaves = resources.reduce((sum, r) => sum + (r.saves || 0), 0)
    const totalBytes = resources.reduce((sum, r) => sum + (r.fileBytes || 0), 0)

    const sortedEducators = [...educators]
      .sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
      .slice(0, 10)

    const upcomingMeetups = [...activeMeetups]
      .sort((a, b) => new Date(a.startsAt).valueOf() - new Date(b.startsAt).valueOf())
      .slice(0, 5)

    return {
      totalEducators,
      totalResources,
      activeMeetups: activeMeetups.length,
      totalRsvps,
      highSchoolCount,
      universityCount,
      verifiedCount,
      formatCounts,
      totalDownloads,
      totalSaves,
      totalBytes,
      sortedEducators,
      upcomingMeetups,
    }
  }, [educators, events, resources])

  if (!authorized) {
    return (
      <main className="min-w-0 flex-1 px-4 py-12 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-100 text-rose-700">
            <Icons.Briefcase className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold tracking-tight text-ink">
            Access Restricted
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The Creator Admin Analytics Dashboard is strictly reserved for the platform administrator
            authenticated as <code className="font-mono text-ink font-semibold">{FOUNDER_EMAIL}</code>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Header bar */}
      <div className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-navy/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-navy">
              Creator Admin Portal
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200/80">
              Platform Metrics
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] text-ink sm:text-3xl">
            Platform Analytics & Governance
          </h1>
          <p className="mt-1 text-sm text-muted">
            Real-time infrastructure and ecosystem metrics for Coursify administrator{" "}
            <span className="font-semibold text-ink">{FOUNDER_EMAIL}</span>.
          </p>
        </div>
      </div>

      {/* Primary 4-metric grid */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
              Total Educators
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-soft text-navy">
              <Icons.Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
            {stats.totalEducators}
          </p>
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted">
            <span>{stats.highSchoolCount} High School</span>
            <span>·</span>
            <span>{stats.universityCount} University</span>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
              Total Uploads
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-soft text-navy">
              <Icons.Upload className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
            {stats.totalResources}
          </p>
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted">
            <span>{stats.totalDownloads} downloads</span>
            <span>·</span>
            <span>{stats.totalSaves} saves</span>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
              Active Meetups
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-soft text-navy">
              <Icons.Calendar className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
            {stats.activeMeetups}
          </p>
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted">
            <span>{stats.totalRsvps} educator RSVPs recorded</span>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
              Verified Status
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-soft text-navy">
              <Icons.VerifiedSeal className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 font-display text-3xl font-bold tracking-[-0.04em] text-ink">
            {stats.verifiedCount}
          </p>
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted">
            <span>{stats.totalEducators - stats.verifiedCount} not verified yet</span>
          </div>
        </article>
      </section>

      <VerificationQueue />

      {/* Breakdown grids */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Resource format distribution */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="font-display text-[16px] font-bold text-ink">Content formats</h2>
          <p className="mt-0.5 text-xs text-muted">Shared curriculum assets by category</p>
          <div className="mt-5 space-y-3 font-sans">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <Icons.Slides className="h-4 w-4 text-navy" />
                Slide Decks
              </span>
              <span className="font-mono font-semibold text-ink">{stats.formatCounts.slides}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <Icons.File className="h-4 w-4 text-navy" />
                Documents & Curriculum
              </span>
              <span className="font-mono font-semibold text-ink">{stats.formatCounts.document}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <Icons.Film className="h-4 w-4 text-navy" />
                Video Lectures
              </span>
              <span className="font-mono font-semibold text-ink">{stats.formatCounts.video}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <Icons.Code className="h-4 w-4 text-navy" />
                Code Archives
              </span>
              <span className="font-mono font-semibold text-ink">{stats.formatCounts.code}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink">
                <Icons.Table className="h-4 w-4 text-navy" />
                Spreadsheets & Data
              </span>
              <span className="font-mono font-semibold text-ink">{stats.formatCounts.spreadsheet}</span>
            </div>
          </div>
          <div className="mt-6 border-t border-line pt-4 flex items-center justify-between text-xs text-muted">
            <span>Storage consumed</span>
            <span className="font-mono font-bold text-ink">{formatBytes(stats.totalBytes)}</span>
          </div>
        </div>

        {/* Recent sign-ups table */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[16px] font-bold text-ink">Recent educator sign-ups</h2>
              <p className="mt-0.5 text-xs text-muted">Real-time registrations across the Coursify faculty network</p>
            </div>
            <span className="font-mono text-xs text-muted">{stats.totalEducators} total accounts</span>
          </div>
          {stats.sortedEducators.length ? (
            <div className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
              {stats.sortedEducators.map((educator) => (
                <div key={educator.id} className="flex items-center justify-between gap-4 bg-canvas/40 px-4 py-3 hover:bg-canvas">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar educator={educator} size={36} rounded="rounded-lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{educator.name}</p>
                        {Boolean(educator.founder) ? (
                          <span className="rounded bg-navy px-1.5 py-0.2 font-mono text-[9px] font-bold text-white">
                            FOUNDER
                          </span>
                        ) : educator.verified ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-emerald-800">
                            VERIFIED
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate font-mono text-[11px] text-muted">
                        {educator.email} · {educator.subject} ({educator.school || "No school specified"})
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {educator.verified && !educator.founder ? <RevokeButton uid={educator.id} name={educator.name} /> : null}
                    <time className="font-mono text-[11px] text-muted">{formatDate(educator.createdAt)}</time>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">No educator accounts registered yet.</p>
          )}
        </div>
      </section>

      {/* Upcoming meetups governance */}
      <section className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h2 className="font-display text-[16px] font-bold text-ink">Scheduled faculty meetups</h2>
        <p className="mt-0.5 text-xs text-muted">Active in-person and online workshops hosted by educators</p>
        {stats.upcomingMeetups.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.upcomingMeetups.map((meetup) => (
              <div key={meetup.id} className="rounded-xl border border-line bg-canvas p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-navy-soft px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-navy">
                    {meetup.format}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {meetup.rsvpIds?.length ?? 0} RSVPs
                  </span>
                </div>
                <h3 className="mt-2.5 truncate font-display text-[15px] font-bold text-ink">
                  {meetup.title}
                </h3>
                <p className="mt-1 font-mono text-xs text-muted">{formatDate(meetup.startsAt)}</p>
                {meetup.location ? (
                  <p className="mt-1 truncate text-xs text-muted">📍 {meetup.location}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">No upcoming meetups scheduled currently.</p>
        )}
      </section>
    </main>
  )
}

function RevokeButton({ uid, name }: { uid: string; name: string }) {
  const { revokeVerification, notify } = useApp()
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-[11px] font-semibold text-muted hover:text-[#8a3b32]">
        Remove badge
      </button>
    )
  }
  return (
    <span className="flex items-center gap-2 text-[11px]">
      <span className="text-muted">Remove {name.split(" ")[0]}&apos;s badge?</span>
      <button
        type="button"
        onClick={async () => {
          const error = await revokeVerification(uid)
          if (error) notify(error)
          setConfirming(false)
        }}
        className="font-semibold text-[#8a3b32]"
      >
        Yes
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="font-semibold text-muted">
        No
      </button>
    </span>
  )
}

const STATUS_STYLE: Record<VerificationRequest["status"], string> = {
  pending: "bg-warn-soft text-warn",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-[#fbeeec] text-[#8a3b32]",
}

/** SACE verification requests. Check the number on the SACE register, then approve or decline. */
function VerificationQueue() {
  const { verificationQueue, reviewVerification, notify } = useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const pending = verificationQueue.filter((item) => item.status === "pending")
  const recent = verificationQueue.filter((item) => item.status !== "pending").slice(0, 6)

  async function decide(item: VerificationRequest, decision: "approved" | "rejected") {
    setBusy(item.uid)
    const error = await reviewVerification(item.uid, decision, notes[item.uid])
    setBusy(null)
    if (error) notify(error)
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[16px] font-bold text-ink">Teacher verification</h2>
          <p className="mt-0.5 text-xs text-muted">
            Look up each SACE number on the{" "}
            <a href="https://www.sace.org.za" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">
              SACE register
            </a>{" "}
            and check the name matches before approving.
          </p>
        </div>
        <span className="rounded-full bg-navy-soft px-2.5 py-1 font-mono text-[11px] font-semibold text-navy">
          {pending.length} waiting
        </span>
      </div>

      {pending.length ? (
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {pending.map((item) => (
            <div key={item.uid} className="grid gap-3 bg-canvas/40 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.name || "Unnamed member"}</p>
                <p className="truncate text-[12px] text-muted">{item.school}</p>
                <p className="mt-0.5 font-mono text-[12px] text-ink">SACE {item.saceNumber}</p>
              </div>
              <input
                value={notes[item.uid] ?? ""}
                onChange={(event) => setNotes({ ...notes, [item.uid]: event.target.value })}
                placeholder="Note shown if you decline (optional)"
                className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] outline-none focus:border-navy"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === item.uid}
                  onClick={() => decide(item, "approved")}
                  className="h-9 rounded-lg bg-navy px-3.5 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === item.uid}
                  onClick={() => decide(item, "rejected")}
                  className="h-9 rounded-lg border border-line px-3.5 text-[13px] font-semibold text-ink hover:border-line-strong disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">No requests waiting. New ones appear here in real time.</p>
      )}

      {recent.length ? (
        <div className="mt-5">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Recently reviewed</h3>
          <ul className="mt-2 space-y-1.5 text-[13px]">
            {recent.map((item) => (
              <li key={item.uid} className="flex items-center justify-between gap-3">
                <span className="truncate text-ink">
                  {item.name} <span className="font-mono text-muted">· SACE {item.saceNumber}</span>
                </span>
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${STATUS_STYLE[item.status]}`}>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
