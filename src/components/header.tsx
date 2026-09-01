import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import Logo from "@/components/logo"
import { useApp } from "@/store"
import type { View } from "@/types"
import { searchEducators } from "@/utils"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"

export default function Header({
  view,
  query,
  onQuery,
  onSearchSubmit,
  onColleague,
  onDiscover,
  onDashboard,
  onProfile,
  onUpload,
  onMessages,
  onOpenMenu,
}: {
  view: View
  query: string
  onQuery: (value: string) => void
  onSearchSubmit: () => void
  onColleague: (id: string) => void
  onDiscover: () => void
  onDashboard: () => void
  onProfile: () => void
  onUpload: () => void
  onMessages: () => void
  onOpenMenu: () => void
}) {
  const { currentUser, educators, unreadCount, followBackSuggestions } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)

  const colleagueMatches = useMemo(() => {
    if (query.trim().length < 2) return []
    return searchEducators(educators, query, currentUser?.id).slice(0, 6)
  }, [currentUser?.id, educators, query])

  const socialAlerts = unreadCount + followBackSuggestions.length

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setFocused(false)
    }
    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [])

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      onSearchSubmit()
      setFocused(false)
    }
    if (event.key === "Escape") {
      setFocused(false)
      event.currentTarget.blur()
    }
  }

  function renderSearchInput(ref: React.RefObject<HTMLInputElement | null>, mobile = false) {
    return (
      <label className="group flex h-10 items-center gap-2.5 rounded-lg border border-line bg-surface px-3.5 transition-colors focus-within:border-navy">
        <Icons.Search className="h-[18px] w-[18px] text-muted transition-colors group-focus-within:text-navy" />
        <input
          ref={ref}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search colleagues, resources, and subjects…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        {!mobile ? (
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted lg:inline">
            ⌘K
          </kbd>
        ) : null}
      </label>
    )
  }

  if (!currentUser) return null

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6 md:gap-6">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-ink lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenMenu}
        >
          <Icons.Menu className="h-5 w-5" />
        </button>

        <button type="button" onClick={onDashboard} className="min-w-0 shrink-0 text-left lg:w-[212px]">
          <Logo />
        </button>

        <div ref={panelRef} className="relative mx-auto hidden w-full max-w-xl lg:block">
          {renderSearchInput(inputRef)}
          {focused && colleagueMatches.length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_16px_48px_rgba(18,20,28,0.12)]">
              <p className="px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Colleagues
              </p>
              {colleagueMatches.map((educator) => (
                <button
                  type="button"
                  key={educator.id}
                  onClick={() => {
                    onColleague(educator.id)
                    setFocused(false)
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-canvas"
                >
                  <Avatar educator={educator} size={32} rounded="rounded-lg" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{educator.name}</span>
                    <span className="block truncate text-[12px] text-muted">{educator.school || educator.subject}</span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onDiscover()
                  setFocused(false)
                }}
                className="w-full border-t border-line px-3.5 py-2.5 text-left text-[12px] font-semibold text-navy hover:bg-canvas"
              >
                View all in Discover
              </button>
            </div>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMessages}
            className="relative grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-navy hover:border-line-strong"
            aria-label="Messages"
          >
            <Icons.Message className="h-[18px] w-[18px]" />
            {socialAlerts > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-navy px-1 font-mono text-[9px] text-white">
                {socialAlerts}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-navy hover:border-line-strong sm:hidden"
            aria-label="Upload resource"
          >
            <Icons.Upload className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="hidden rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong sm:inline-flex"
          >
            Upload resource
          </button>
          <button
            type="button"
            onClick={onProfile}
            className={`flex min-h-10 items-center gap-2.5 rounded-lg border bg-surface py-1.5 pl-1.5 pr-2 sm:pr-3 transition-colors hover:border-line-strong ${
              view === "profile" ? "border-navy" : "border-line"
            }`}
          >
            <Avatar educator={currentUser} size={32} />
            <span className="hidden max-w-[9rem] text-left leading-tight lg:max-w-[14rem] sm:block">
              <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink">
                {currentUser.name}
                {currentUser.verified ? (
                  <Icons.VerifiedSeal className="h-3.5 w-3.5 shrink-0" />
                ) : null}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-wide text-muted">
                {currentUser.verified ? "Verified educator" : "Educator"}
              </span>
            </span>
          </button>
        </div>
      </div>
      <div className="border-t border-line px-3 py-2 sm:px-6 lg:hidden">
        {renderSearchInput(mobileInputRef, true)}
      </div>
    </header>
  )
}
