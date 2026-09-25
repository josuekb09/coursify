import Avatar from "@/components/avatar"
import { CoursifyMark } from "@/components/logo"
import CvModal from "@/components/cv-modal"
import Icons from "@/components/icons"
import ProfileEditor from "@/components/profile-editor"
import ResourceCard from "@/components/resource-card"
import { profileTabs } from "@/data"
import { institutionLabels } from "@/data"
import { useApp } from "@/store"
import type { Educator, ProfileTab } from "@/types"
import {
  buildCvText,
  downloadTextFile,
  followButtonLabel,
  formatCount,
  formatEducatorActivity,
  kindToTab,
} from "@/utils"
import { useEffect, useMemo, useState } from "react"
import { isFounderEmail } from "@/security"

export default function Profile({
  educator,
  startEditing = false,
  onEditingChange,
  onUpload,
  onMessage,
}: {
  educator: Educator
  startEditing?: boolean
  onEditingChange?: (editing: boolean) => void
  onUpload: () => void
  onMessage: (id: string) => void
}) {
  const {
    currentUser,
    myResources,
    resources,
    savedResources,
    notify,
    toggleFollow,
    isFollowing,
    followsYou,
    followerCount,
    followingCount,
  } = useApp()
  const [tab, setTab] = useState<ProfileTab>("Resources")
  const [cvOpen, setCvOpen] = useState(false)
  const [editing, setEditing] = useState(startEditing)
  const [followBusy, setFollowBusy] = useState(false)

  useEffect(() => {
    setEditing(startEditing)
  }, [startEditing])

  function setProfileEditing(next: boolean) {
    setEditing(next)
    onEditingChange?.(next)
  }

  const isOwner = currentUser?.id === educator.id
  const founder = isFounderEmail(educator.email)
  const profileIncomplete = isOwner && (!educator.bio.trim() || !educator.school.trim())
  const mine = isOwner ? myResources : resources.filter((item) => item.authorId === educator.id)
  const items = useMemo(() => mine.filter((item) => kindToTab(item.kind) === tab), [mine, tab])
  const tabCounts = useMemo(() => {
    const counts: Record<ProfileTab, number> = { Resources: 0, "Lesson Plans": 0, Collections: 0 }
    for (const item of mine) counts[kindToTab(item.kind)] += 1
    return counts
  }, [mine])
  const downloads = mine.reduce((sum, item) => sum + item.downloads, 0)
  const activity = formatEducatorActivity(educator.lastActiveAt)

  const following = isFollowing(educator.id)
  const theyFollowYou = followsYou(educator.id)
  const followLabel = followButtonLabel(following, theyFollowYou)
  const metrics = [
    { label: "Resources", value: String(mine.length), icon: Icons.Layers },
    { label: "Followers", value: formatCount(followerCount(educator.id)), icon: Icons.Users },
    { label: "Following", value: formatCount(followingCount(educator.id)), icon: Icons.Users3 },
    isOwner
      ? { label: "Saved", value: String(savedResources.length), icon: Icons.Bookmark }
      : { label: "Downloads", value: formatCount(downloads), icon: Icons.Download },
  ]
  const cvFileName = `${educator.name.trim().replace(/\s+/g, "_")}_CV.txt`

  function downloadCv() {
    downloadTextFile(cvFileName, buildCvText(educator))
    notify(`Downloading ${cvFileName}`)
  }

  async function handleFollow() {
    if (followBusy) return
    setFollowBusy(true)
    try {
      await toggleFollow(educator.id)
      notify(following ? `Unfollowed ${educator.name}` : `Following ${educator.name}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update follow. Please try again.")
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {profileIncomplete ? (
          <div className="animate-rise mb-5 flex flex-col gap-4 rounded-2xl border border-[#dde3ef] bg-navy-soft p-5 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-navy">
              <Icons.Sparkle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-bold text-ink">Finish setting up your profile</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">
                Add your school and a short bio so colleagues know who they're learning from.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProfileEditing(true)}
              className="h-10 shrink-0 rounded-xl bg-navy px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-hover"
            >
              Complete profile
            </button>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-line bg-surface">
          {/* Cover */}
          <div className="relative h-36 overflow-hidden bg-navy sm:h-44">
            <div
              className="absolute inset-0 opacity-90"
              style={{
                background:
                  "radial-gradient(120% 140% at 0% 0%, #2c4470 0%, rgba(26,43,74,0) 55%), radial-gradient(90% 120% at 100% 100%, #0f1b33 0%, rgba(26,43,74,0) 60%)",
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 opacity-[0.09]" aria-hidden="true">
              <CoursifyMark className="h-full w-full [&_path]:!fill-white" />
            </div>
          </div>

          {/* Identity */}
          <div className="px-5 pb-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="relative -mt-14 w-fit sm:-mt-16">
                <Avatar
                  educator={educator}
                  size={120}
                  rounded="rounded-full"
                  className="shadow-[0_8px_24px_rgba(18,20,28,0.18)] ring-[5px] ring-surface"
                />
                {activity.isOnline ? (
                  <span
                    className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-[3px] border-surface bg-online"
                    title="Active now"
                  />
                ) : null}
              </div>

              <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:pb-1">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setProfileEditing(true)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-line-strong sm:flex-none"
                    >
                      <Icons.Pencil className="h-4 w-4" />
                      Edit profile
                    </button>
                    <button
                      type="button"
                      onClick={onUpload}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-hover sm:flex-none"
                    >
                      <Icons.Upload className="h-4 w-4" />
                      Share a resource
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={followBusy}
                      onClick={() => void handleFollow()}
                      className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:opacity-60 sm:flex-none ${
                        following
                          ? "border border-line bg-surface text-ink hover:border-line-strong"
                          : "bg-navy text-white hover:bg-navy-hover"
                      }`}
                    >
                      {following ? <Icons.Check className="h-4 w-4" /> : <Icons.Plus className="h-4 w-4" />}
                      {followBusy ? "Updating…" : followLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => onMessage(educator.id)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-ink transition-colors hover:border-line-strong sm:flex-none"
                    >
                      <Icons.Message className="h-4 w-4" />
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink sm:text-[30px]">
                {educator.name}
                {educator.verified ? <Icons.VerifiedSeal className="h-6 w-6" title="Verified educator" /> : null}
                {founder ? (
                  <span className="rounded-full bg-navy px-2.5 py-0.5 font-sans text-[11px] font-semibold tracking-normal text-white">
                    Founder
                  </span>
                ) : null}
              </h1>
              <p className="mt-1 text-[15.5px] text-ink/80">
                {educator.subject} teacher
                {educator.school ? (
                  <>
                    {" "}
                    at <span className="font-semibold text-ink">{educator.school}</span>
                  </>
                ) : isOwner ? (
                  <span className="text-muted"> · add your school</span>
                ) : null}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip icon={Icons.Book}>{institutionLabels[educator.institutionLevel]}</Chip>
                <Chip icon={Icons.Calendar}>Joined {educator.joinedYear}</Chip>
                {!isOwner && theyFollowYou ? <Chip icon={Icons.Users}>Follows you</Chip> : null}
                {isOwner ? <Chip icon={Icons.Mail}>{educator.email}</Chip> : null}
                {!isOwner && !activity.isOnline && educator.lastActiveAt ? (
                  <Chip icon={Icons.Clock}>{activity.label}</Chip>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-line bg-canvas/60 px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
                    <metric.icon className="h-3.5 w-3.5" />
                    {metric.label}
                  </div>
                  <p className="mt-1 font-display text-[26px] font-bold leading-none tracking-[-0.02em] text-ink tabular-nums">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <section className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-display text-[16px] font-bold text-ink">About</h2>
              {educator.bio ? (
                <p className="mt-2.5 whitespace-pre-line text-[14.5px] leading-[1.65] text-ink/80">{educator.bio}</p>
              ) : (
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
                  {isOwner ? (
                    <>
                      Tell colleagues what you teach, where, and what you're good at.{" "}
                      <button
                        type="button"
                        onClick={() => setProfileEditing(true)}
                        className="font-semibold text-navy underline-offset-2 hover:underline"
                      >
                        Add a bio
                      </button>
                    </>
                  ) : (
                    `${educator.name.split(" ")[0]} hasn't written a bio yet.`
                  )}
                </p>
              )}
              <dl className="mt-5 space-y-3 border-t border-line pt-5 text-[13.5px]">
                <InfoRow icon={Icons.Layers} label="Subject" value={educator.subject} />
                <InfoRow icon={Icons.Briefcase} label="School" value={educator.school || "Not added yet"} />
                <InfoRow icon={Icons.Book} label="Level" value={institutionLabels[educator.institutionLevel]} />
              </dl>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[16px] font-bold text-ink">Curriculum vitae</h2>
                <span className="text-[12px] text-muted">From profile</span>
              </div>
              <button
                type="button"
                onClick={() => setCvOpen(true)}
                className="group mt-4 flex w-full items-center gap-3 rounded-xl border border-line bg-canvas/60 p-3 text-left transition-colors hover:border-line-strong"
              >
                <span className="relative grid h-12 w-10 shrink-0 place-items-center rounded-md border border-line bg-surface text-navy shadow-[0_1px_2px_rgba(18,20,28,0.06)]">
                  <Icons.File className="h-5 w-5" />
                  <span className="absolute -bottom-1 rounded bg-navy px-1 font-mono text-[8px] font-bold leading-[13px] text-white">
                    TXT
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{cvFileName}</span>
                  <span className="block text-[12px] text-muted">Tap to preview</span>
                </span>
                <Icons.Eye className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
              </button>
              <button
                type="button"
                onClick={downloadCv}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-navy text-[13px] font-semibold text-white transition-colors hover:bg-navy-hover"
              >
                <Icons.Download className="h-4 w-4" />
                Download CV
              </button>
            </section>
          </div>

          <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-[16px] font-bold text-ink">
                {isOwner ? "Your materials" : `Materials by ${educator.name.split(" ")[0]}`}
              </h2>
              <div className="-mx-1 overflow-x-auto px-1">
                <div className="inline-flex min-w-max gap-1 rounded-xl bg-canvas p-1">
                  {profileTabs.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => setTab(item)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                        tab === item
                          ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,20,28,0.08)]"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {item}
                      <span className="text-[11px] tabular-nums text-muted">{tabCounts[item]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {items.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {items.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} compact />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-navy-soft text-navy">
                  <Icons.Folder className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-ink">
                  No {tab.toLowerCase()} yet
                </p>
                <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted">
                  {isOwner
                    ? "Share a worksheet, slide deck or lesson plan. Someone out there is planning the same lesson."
                    : "Check back later, or send a message to ask what they're working on."}
                </p>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={onUpload}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-hover"
                  >
                    <Icons.Upload className="h-4 w-4" />
                    Share a resource
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>

      {cvOpen ? <CvModal educator={educator} onClose={() => setCvOpen(false)} onDownload={downloadCv} /> : null}
      {editing ? <ProfileEditor educator={educator} onClose={() => setProfileEditing(false)} /> : null}
    </main>
  )
}

function Chip({ icon: Icon, children }: { icon: (props: { className?: string }) => React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] text-muted">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: (props: { className?: string }) => React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <dt className="w-16 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium text-ink">{value}</dd>
    </div>
  )
}
