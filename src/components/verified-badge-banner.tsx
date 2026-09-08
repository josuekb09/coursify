import Icons from "@/components/icons"
import { useApp } from "@/store"
import { useState } from "react"

export default function VerifiedBadgeBanner() {
  const { badgeEligible, claimVerifiedBadge, notify } = useApp()
  const [busy, setBusy] = useState(false)

  if (!badgeEligible) return null

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
          {busy ? "Claiming status…" : "Claim Verified Badge"}
        </button>
      </div>
    </div>
  )
}
