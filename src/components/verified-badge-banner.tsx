import Icons from "@/components/icons"
import { isFounderEmail } from "@/security"
import { useApp } from "@/store"
import { useEffect, useState } from "react"

export default function VerifiedBadgeBanner({
  onViewProfile,
}: {
  onViewProfile?: () => void
}) {
  const { currentUser } = useApp()
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
              You&apos;re a verified teacher, {currentUser.name.split(" ")[0]}.
            </p>
            <p className="hidden text-[12.5px] text-muted sm:block">
              Your SACE registration is confirmed. The badge now shows on your profile and resources.
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

  if (currentUser?.verified) return null
  return <TeacherVerificationPrompt />
}

const field =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.10)]"

/** Asks unverified members for their SACE number; the founder approves it from the admin view. */
function TeacherVerificationPrompt() {
  const { currentUser, verificationRequest, requestVerification, emailVerified } = useApp()
  const [open, setOpen] = useState(false)
  const [saceNumber, setSaceNumber] = useState("")
  const [school, setSchool] = useState(currentUser?.school ?? "")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const status = verificationRequest?.status
  const shell = "mx-4 mt-4 rounded-2xl border px-4 py-3 sm:mx-6 sm:px-5 lg:mx-10"

  if (status === "pending" && !open) {
    return (
      <div className={`${shell} border-line bg-surface`}>
        <p className="flex items-center gap-2.5 text-[13.5px] text-ink">
          <Icons.Clock className="h-4 w-4 shrink-0 text-navy" />
          <span>
            <span className="font-semibold">Verification in progress.</span>{" "}
            <span className="text-muted">We&apos;re checking SACE number {verificationRequest?.saceNumber}. You&apos;ll get the badge as soon as it&apos;s confirmed.</span>
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className={`${shell} border-navy/15 bg-navy-soft/60`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy text-white sm:grid">
          <Icons.Shield className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-ink">
            {status === "rejected" ? "We couldn't confirm your SACE registration." : "Are you a teacher? Get verified."}
          </p>
          <p className="text-[12.5px] leading-relaxed text-muted">
            {status === "rejected" && verificationRequest?.note
              ? verificationRequest.note
              : "Verified teachers can share resources and host meetups. We check your SACE registration number, nothing else."}
          </p>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy px-3.5 text-[13px] font-semibold text-white hover:bg-navy-hover"
          >
            {status === "rejected" ? "Try again" : "Verify me"}
          </button>
        ) : null}
      </div>
      {open ? (
        <form
          className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-start"
          onSubmit={async (event) => {
            event.preventDefault()
            if (busy) return
            setBusy(true)
            setError(null)
            const result = await requestVerification({ saceNumber, school })
            setBusy(false)
            if (result) setError(result)
            else setOpen(false)
          }}
        >
          <label className="block">
            <span className="sr-only">SACE registration number</span>
            <input
              value={saceNumber}
              onChange={(event) => setSaceNumber(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="SACE number"
              className={field}
            />
          </label>
          <label className="block">
            <span className="sr-only">School</span>
            <input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="School where you teach" className={field} />
          </label>
          <button
            type="submit"
            disabled={busy || !emailVerified}
            className="h-10 rounded-lg bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send for review"}
          </button>
          {!emailVerified ? (
            <p className="text-[12.5px] text-warn sm:col-span-3">Confirm your email address first (see the yellow bar above).</p>
          ) : null}
          {error ? <p className="text-[12.5px] text-[#8a3b32] sm:col-span-3">{error}</p> : null}
        </form>
      ) : null}
    </div>
  )
}
