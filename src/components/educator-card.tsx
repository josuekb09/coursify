import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import { institutionLabels } from "@/data"
import { isFounderEmail } from "@/security"
import { useApp } from "@/store"
import type { Educator } from "@/types"
import { followButtonLabel } from "@/utils"
import { useState } from "react"

export default function EducatorCard({
  educator,
  onProfile,
  onMessage,
}: {
  educator: Educator
  onProfile: (id: string) => void
  onMessage: (id: string) => void
}) {
  const { currentUser, toggleFollow, isFollowing, followsYou, followerCount, notify } = useApp()
  const [followBusy, setFollowBusy] = useState(false)
  const following = isFollowing(educator.id)
  const theyFollowYou = followsYou(educator.id)
  const isSelf = currentUser?.id === educator.id
  const followLabel = followButtonLabel(following, theyFollowYou)
  const isCreator = isFounderEmail(educator.email)
  const followers = followerCount(educator.id)

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
      <div>
        <button
          type="button"
          onClick={() => onProfile(educator.id)}
          className="flex w-full items-start gap-3.5 text-left"
        >
          <div className="relative shrink-0">
            <Avatar educator={educator} size={52} rounded="rounded-2xl" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-emerald-500" title="Active on Coursify" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[15px] font-bold tracking-tight text-ink group-hover:text-navy transition-colors">
                {educator.name}
              </span>
              {isCreator ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-navy/10 px-2 py-0.5 font-mono text-[10px] font-bold text-navy shadow-2xs">
                  <Icons.VerifiedSeal className="h-3 w-3" />
                  Founder · Verified
                </span>
              ) : educator.verified ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-700 shadow-2xs">
                  <Icons.VerifiedSeal className="h-3 w-3" />
                  Verified
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 truncate text-[13px] font-medium text-muted">
              {educator.school || "Faculty Institution Not Set"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              <span className="rounded-md border border-line bg-canvas/70 px-2 py-0.5 font-medium text-ink">
                {educator.subject}
              </span>
              <span className="text-muted/60">•</span>
              <span className="font-mono">{institutionLabels[educator.institutionLevel]}</span>
            </div>
          </div>
        </button>

        {educator.bio ? (
          <p className="mt-3.5 line-clamp-2 text-[12px] leading-relaxed text-muted">
            {educator.bio}
          </p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-line/60 pt-3.5">
        <div className="mb-3 flex items-center justify-between text-[11px] text-muted font-mono">
          <span>
            <strong className="text-ink">{followers}</strong> {followers === 1 ? "colleague" : "colleagues"} following
          </span>
          {theyFollowYou ? (
            <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-semibold text-navy">
              Follows you
            </span>
          ) : null}
        </div>

        {!isSelf ? (
          <div className="flex gap-2">
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
                    notify(error instanceof Error ? error.message : "Could not update follow.")
                  } finally {
                    setFollowBusy(false)
                  }
                })()
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold shadow-2xs transition-all active:scale-98 disabled:opacity-60 ${
                following
                  ? "border border-line bg-surface text-ink hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  : "bg-navy text-white hover:bg-navy-hover"
              }`}
            >
              {followBusy ? "Updating…" : followLabel}
            </button>
            <button
              type="button"
              onClick={() => onMessage(educator.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink shadow-2xs transition-all hover:border-navy hover:text-navy active:scale-98"
            >
              <Icons.Message className="h-3.5 w-3.5" />
              <span>Message</span>
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-canvas py-1.5 text-center font-mono text-[11px] text-muted">
            Your Profile
          </div>
        )}
      </div>
    </article>
  )
}
