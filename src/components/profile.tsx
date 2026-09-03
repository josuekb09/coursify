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
import { buildCvText, downloadTextFile, followButtonLabel, formatCount, kindToTab } from "@/utils"
import { useEffect, useMemo, useState } from "react"

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
  const profileIncomplete = isOwner && (!educator.bio.trim() || !educator.school.trim())
  const mine = isOwner ? myResources : resources.filter((item) => item.authorId === educator.id)
  const items = useMemo(
    () => mine.filter((item) => kindToTab(item.kind) === tab),
    [mine, tab],
  )
  const downloads = mine.reduce((sum, item) => sum + item.downloads, 0)

  const following = isFollowing(educator.id)
  const theyFollowYou = followsYou(educator.id)
  const followLabel = followButtonLabel(following, theyFollowYou)
  const metrics = [
    { label: "Resources", value: String(mine.length) },
    { label: "Followers", value: formatCount(followerCount(educator.id)) },
    { label: "Following", value: formatCount(followingCount(educator.id)) },
    {
      label: isOwner ? "Saved" : "Downloads",
      value: isOwner ? String(savedResources.length) : formatCount(downloads),
    },
  ]

  function downloadCv() {
    const filename = `${educator.name.trim().replace(/\s+/g, "_")}_CV.txt`
    downloadTextFile(filename, buildCvText(educator))
    notify(`Downloading ${filename}`)
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {profileIncomplete ? (
        <div className="mb-6 rounded-xl border border-navy/20 bg-navy-soft p-5">
          <p className="font-display text-[15px] font-semibold text-ink">Complete your profile</p>
          <p className="mt-1 text-sm text-muted">
            Add your institution, bio, subject, photo, and CV so colleagues can find and trust your
            profile.
          </p>
          <button
            type="button"
            onClick={() => setProfileEditing(true)}
            className="mt-3 rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
          >
            Open profile editor
          </button>
        </div>
      ) : null}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="relative h-32 bg-navy lg:h-36">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-56 w-56 opacity-[0.1]"
            aria-hidden="true"
          >
            <CoursifyMark className="h-full w-full [&_path]:!fill-white" />
          </div>
        </div>

        <div className="px-6 pb-6 lg:px-8 lg:pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar
                educator={educator}
                size={112}
                rounded="rounded-2xl border-4 border-surface"
                className="-mt-12 shrink-0 lg:-mt-14"
              />
              <div className="pb-1">
                <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-[-0.02em] text-ink lg:text-[28px]">
                  {educator.name}
                  {educator.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-navy-soft px-2 py-0.5 font-sans text-[11px] font-semibold tracking-normal text-navy">
                      <Icons.VerifiedSeal className="h-3.5 w-3.5" />
                      Verified Educator
                    </span>
                  ) : null}
                </h1>
                <p className="mt-1 text-[15px] font-medium text-ink/80">
                  {educator.school || (isOwner ? "Add your institution in profile settings" : "Institution not set")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Icons.Layers className="h-3.5 w-3.5" />
                    {educator.subject}
                  </span>
                  <span>{institutionLabels[educator.institutionLevel]}</span>
                  {isOwner ? <span>{educator.email}</span> : null}
                  <span>Joined {educator.joinedYear}</span>
                </div>
              </div>
            </div>

            {isOwner ? (
              <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={() => setProfileEditing(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:border-line-strong"
                >
                  <Icons.Pencil className="h-4 w-4" />
                  Edit profile
                </button>
                <button
                  type="button"
                  onClick={onUpload}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-hover"
                >
                  <Icons.Plus className="h-4 w-4" />
                  Upload
                </button>
              </div>
            ) : (
              <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  disabled={followBusy}
                  onClick={() => {
                    if (followBusy) return
                    setFollowBusy(true)
                    void (async () => {
                      try {
                        await toggleFollow(educator.id)
                        notify(following ? `Unfollowed ${educator.name}` : `Following ${educator.name}`)
                      } catch (error) {
                        notify(error instanceof Error ? error.message : "Could not update follow. Please try again.")
                      } finally {
                        setFollowBusy(false)
                      }
                    })()
                  }}
                  className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                    following
                      ? "border border-line text-ink hover:border-line-strong"
                      : "bg-navy text-white hover:bg-navy-hover"
                  }`}
                >
                  {followBusy ? "Updating…" : followLabel}
                </button>
                <button
                  type="button"
                  onClick={() => onMessage(educator.id)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:border-line-strong"
                >
                  <Icons.Message className="h-4 w-4 text-navy" />
                  Message
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 divide-line rounded-xl border border-line sm:grid-cols-4 sm:divide-x">
            {metrics.map((metric) => (
              <div key={metric.label} className="px-5 py-4">
                <p className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
                  {metric.value}
                </p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              <Icons.Award className="h-3.5 w-3.5" />
              Bio & credentials
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink/80">
              {educator.bio || (isOwner ? "Add your bio and credentials in the profile editor." : "No bio yet.")}
            </p>
          </section>

          <section className="rounded-xl border border-line bg-surface p-6">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Curriculum Vitae
            </h2>
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-canvas p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy text-white">
                <Icons.File className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">
                  {educator.name.trim().replace(/\s+/g, "_")}_CV.txt
                </p>
                <p className="font-mono text-[11px] text-muted">Generated from your profile</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2.5">
              <button
                type="button"
                onClick={downloadCv}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-hover"
              >
                <Icons.Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                onClick={() => setCvOpen(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3.5 py-2.5 text-[13px] font-medium text-ink hover:border-line-strong"
              >
                <Icons.Eye className="h-4 w-4" />
                Preview
              </button>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
              Uploaded materials
            </h2>
            <div className="w-full overflow-x-auto">
              <div className="inline-flex min-w-max rounded-lg border border-line bg-canvas p-0.5">
              {profileTabs.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setTab(item)}
                  className={`min-h-10 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    tab === item ? "bg-navy text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {item}
                </button>
              ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} compact />
            ))}
          </div>
          {items.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted">
              {isOwner
                ? "Nothing in this tab yet. Upload a resource to appear here."
                : "No materials in this tab yet."}
            </p>
          ) : null}
        </section>
      </div>

      {cvOpen ? (
        <CvModal educator={educator} onClose={() => setCvOpen(false)} onDownload={downloadCv} />
      ) : null}
      {editing ? <ProfileEditor educator={educator} onClose={() => setProfileEditing(false)} /> : null}
    </main>
  )
}
