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
    setDismissed(localStorage.getItem(key) === "true")
  }, [currentUser])

  function handleDismiss() {
    if (currentUser) {
      localStorage.setItem(`coursify.celebrated_badge.${currentUser.id}`, "true")
    }
    setDismissed(true)
  }

  // If creator, verified status is native/permanent; no merit banner needed
  if (isCreator) return null

  // Case 1: Newly verified or earned via merit (Celebratory Banner)
  if (currentUser?.verified && currentUser?.badgeClaimed && !dismissed) {
    return (
      <div className="mx-4 mt-4 overflow-hidden rounded-2xl border border-sky-300/80 bg-gradient-to-r from-sky-50 via-surface to-sky-50 px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top-2 sm:mx-6 lg:mx-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-600 text-white shadow-sm ring-4 ring-sky-100">
              <Icons.VerifiedSeal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  Merit Verified Achieved
                </span>
                <span className="text-xs text-muted font-mono">Platform Standard</span>
              </div>
              <p className="mt-1 text-[14px] font-bold tracking-tight text-ink sm:text-[15px]">
                🎉 Congratulations, {currentUser.name}! You&apos;ve earned the Verified Educator Badge
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Merit system unlocked: 100% complete faculty profile + 3 or more published curriculum resources.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {onViewProfile ? (
              <button
                type="button"
                onClick={onViewProfile}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-surface px-3.5 py-2 text-xs font-semibold text-sky-800 shadow-2xs hover:bg-sky-50 transition"
              >
                <Icons.Eye className="h-3.5 w-3.5" />
                <span>View Profile</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-800 transition"
            >
              <span>Dismiss</span>
              <Icons.Close className="h-3.5 w-3.5 opacity-75" />
            </button>
          </div>
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
