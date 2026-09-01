import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import { institutionLabels } from "@/data"
import { useApp } from "@/store"
import type { Educator } from "@/types"
import { followButtonLabel } from "@/utils"

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
  const following = isFollowing(educator.id)
  const theyFollowYou = followsYou(educator.id)
  const isSelf = currentUser?.id === educator.id
  const followLabel = followButtonLabel(following, theyFollowYou)

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <button type="button" onClick={() => onProfile(educator.id)} className="flex items-start gap-3 text-left">
        <Avatar educator={educator} size={48} rounded="rounded-xl" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-ink">
            {educator.name}
            {educator.verified ? <Icons.VerifiedSeal className="h-3.5 w-3.5 text-navy" /> : null}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-muted">{educator.school || "Institution not set"}</p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {institutionLabels[educator.institutionLevel]} · {educator.subject} · {followerCount(educator.id)}{" "}
            {followerCount(educator.id) === 1 ? "follower" : "followers"}
          </p>
        </div>
      </button>
      {!isSelf ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              toggleFollow(educator.id)
              notify(following ? `Unfollowed ${educator.name}` : `Following ${educator.name}`)
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold ${
              following
                ? "border border-line text-ink hover:border-line-strong"
                : theyFollowYou
                  ? "bg-navy text-white hover:bg-navy-hover"
                  : "bg-navy text-white hover:bg-navy-hover"
            }`}
          >
            {followLabel}
          </button>
          <button
            type="button"
            onClick={() => onMessage(educator.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-strong"
          >
            <Icons.Message className="h-4 w-4 text-navy" />
            Message
          </button>
        </div>
      ) : (
        <p className="mt-4 font-mono text-[11px] text-muted">This is your profile.</p>
      )}
    </article>
  )
}
