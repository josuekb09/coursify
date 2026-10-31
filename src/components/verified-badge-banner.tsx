import Icons from "@/components/icons"
import { isFounderEmail } from "@/security"
import { useApp } from "@/store"
import { useEffect, useState } from "react"

export default function VerifiedBadgeBanner({
  onViewProfile,
}: {
  onViewProfile?: () => void
}) {
  const { currentUser, badgeEligible, claimVerifiedBadge, notify } = useApp()
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const isCreator = isFounderEmail(currentUser?.email ?? "")

  useEffect(() => {
    if (!currentUser) return
    const key = `coursify.celebrated_badge.${currentUser.id}`
    try {
      setDismissed(localStorage.getItem(key) === "true")
    } catch {
      setDismissed(false)
    }
  }, [currentUser])

  function handleDismiss() {
    try {
      if (currentUser) localStorage.setItem(`coursify.celebrated_badge.${currentUser.id}`, "true")
    } catch {
      /* private mode: dismissed for this visit only */
    }
    setDismissed(true)
  }

  // If creator, verified status is native/permanent; no merit banner needed
  if (isCreator) return null

  // Case 1: Newly verified or earned via merit (Celebratory Banner)
  if (currentUser?.verified && currentUser?.badgeClaimed && !dismissed) {
    return (
      <div className="mx-4 mt-4 animate-sheet-up rounded-2xl border border-navy/15 bg-gradient-to-r from-navy-soft via-surface to-navy-soft px-4 py-3 sm:mx-6 sm:px-5 lg:mx-10">
        <div className="flex items-center gap-3">
          <Icons.VerifiedSeal className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-snug text-ink">
              You&apos;re a verified educator, {currentUser.name.split(" ")[0]}.
            </p>
            <p className="hidden text-[12.5px] text-muted sm:block">
              Your profile is complete and you&apos;ve shared three resources. The badge now shows on your profile.
            </p>
          </div>
          {onViewProfile ? (
            <button
              type="button"
              onClick={onViewProfile}
              className="hidden h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold text-navy hover:border-line-strong sm:inline-flex"
            >
              View profile
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-black/[0.04] hover:text-ink"
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Case 2: User eligible but async store update still in flight
  if (badgeEligible && !currentUser?.verified) {
    return (
      <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-navy/20 bg-gradient-to-r from-navy-soft via-surface to-navy-soft px-5 py-4 shadow-sm sm:mx-6 lg:mx-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
              <Icons.VerifiedSeal className="h-5 w-5 [&_path:first-child]:fill-white [&_path:last-child]:stroke-navy" />
            </div>
            <div>
              <p className="text-[14px] font-bold tracking-tight text-ink sm:text-[15px]">
                You&apos;ve earned Verified Educator status!
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Merit criteria unlocked: Profile complete + at least 3 shared curriculum resources.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void claimVerifiedBadge()
                .then((error) => error && notify(error))
                .finally(() => setBusy(false))
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-navy-hover disabled:opacity-60"
          >
            <Icons.Award className="h-4 w-4" />
            {busy ? "Activating badge…" : "Claim Verified Badge"}
          </button>
        </div>
      </div>
    )
  }

  return null
}
