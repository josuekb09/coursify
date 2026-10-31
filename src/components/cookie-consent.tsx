import { useEffect, useState } from "react"

const STORAGE_KEY = "coursify.cookie-consent.v1"
const OPEN_EVENT = "coursify:cookie-settings"

export type CookieChoice = "all" | "essential"

export function readCookieChoice(): CookieChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === "all" || value === "essential" ? value : null
  } catch {
    return null
  }
}

/** Optional scripts (analytics, if ever added) must check this before loading. */
export function analyticsAllowed() {
  return readCookieChoice() === "all"
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export default function CookieConsent() {
  const [open, setOpen] = useState(() => readCookieChoice() === null)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [])

  function choose(choice: CookieChoice) {
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      /* private mode: the banner simply shows again next visit */
    }
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl animate-sheet-up rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_24px_60px_rgba(18,20,28,0.18)] backdrop-blur-md sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <p className="font-display text-[15px] font-bold text-ink">Your privacy, your choice</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Coursify only stores what it needs to keep you signed in. No advertising or tracking cookies.{" "}
        <a href="/cookies" className="font-semibold text-navy underline">
          Cookie policy
        </a>
      </p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => choose("essential")}
          className="h-10 rounded-lg border border-line px-4 text-[13px] font-semibold text-ink hover:bg-canvas"
        >
          Essential only
        </button>
        <button
          type="button"
          onClick={() => choose("all")}
          className="h-10 rounded-lg bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-hover"
        >
          Accept all
        </button>
      </div>
    </div>
  )
}
