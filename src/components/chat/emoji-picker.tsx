import Icons from "@/components/icons"
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react"

type Emoji = { e: string; c: string; k: string; s?: string[] }

const CATEGORIES: { id: string; name: string; Icon: ComponentType<{ className?: string }> }[] = [
  { id: "recent", name: "Recent", Icon: Icons.History },
  { id: "smileys", name: "Smileys & emotion", Icon: Icons.Smile },
  { id: "people", name: "People & body", Icon: Icons.Users },
  { id: "nature", name: "Animals & nature", Icon: Icons.Paw },
  { id: "food", name: "Food & drink", Icon: Icons.Apple },
  { id: "travel", name: "Travel & places", Icon: Icons.Plane },
  { id: "activities", name: "Activities", Icon: Icons.Trophy },
  { id: "objects", name: "Objects", Icon: Icons.Lightbulb },
  { id: "symbols", name: "Symbols", Icon: Icons.Heart },
  { id: "flags", name: "Flags", Icon: Icons.Flag },
]

// Light → dark, matching the order of each emoji's `s` variants. Index -1 is the default yellow.
const TONES = ["#f7dece", "#f3d2a2", "#d5ab88", "#af7e57", "#7c533e"]
const RECENT_KEY = "coursify.emoji.recent"
const TONE_KEY = "coursify.emoji.tone"
const RECENT_LIMIT = 32

let catalogPromise: Promise<Emoji[]> | null = null
/** The full emoji list (~1,900) is split into its own chunk and loaded the first time the picker opens. */
function loadCatalog() {
  catalogPromise ??= import("@/emoji-data.json").then((module) => module.default as Emoji[])
  return catalogPromise
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function store(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode: recents just won't persist */
  }
}

export default function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [catalog, setCatalog] = useState<Emoji[] | null>(null)
  const [search, setSearch] = useState("")
  const [tone, setTone] = useState<number>(() => readStored(TONE_KEY, -1))
  const [toneOpen, setToneOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => readStored(RECENT_KEY, []))
  const [active, setActive] = useState("smileys")
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const jumpedAtRef = useRef(0)

  useEffect(() => {
    let alive = true
    void loadCatalog().then((items) => alive && setCatalog(items))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    function onDown(event: PointerEvent) {
      const target = event.target as Element
      if (ref.current?.contains(target) || target.closest?.("[data-emoji-toggle]")) return
      onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const withTone = (item: Emoji) => (tone >= 0 && item.s ? item.s[tone] : item.e)

  const sections = useMemo(() => {
    if (!catalog) return []
    const byCategory = new Map<string, Emoji[]>()
    for (const item of catalog) {
      const list = byCategory.get(item.c) ?? []
      list.push(item)
      byCategory.set(item.c, list)
    }
    return CATEGORIES.filter((category) => category.id !== "recent").map((category) => ({
      ...category,
      items: byCategory.get(category.id) ?? [],
    }))
  }, [catalog])

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle || !catalog) return null
    const terms = needle.split(/\s+/)
    return catalog.filter((item) => terms.every((term) => item.k.includes(term))).slice(0, 160)
  }, [catalog, search])

  // Highlight the tab of the section at the top of the list as it scrolls.
  function onScroll() {
    const list = scrollRef.current
    if (!list || results || Date.now() - jumpedAtRef.current < 900) return
    let current = ""
    list.querySelectorAll<HTMLElement>("[data-section]").forEach((node) => {
      if (node.offsetTop <= list.scrollTop + 24) current = node.dataset.section ?? current
    })
    if (current && current !== active) setActive(current)
  }

  function pick(emoji: string) {
    onPick(emoji)
    const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, RECENT_LIMIT)
    setRecent(next)
    store(RECENT_KEY, next)
  }

  function jump(id: string) {
    setSearch("")
    jumpedAtRef.current = Date.now()
    const list = scrollRef.current
    const node = list?.querySelector<HTMLElement>(`[data-section="${id}"]`)
    if (node && list) {
      // Long jumps snap straight there; a smooth scroll across thousands of emoji feels sluggish.
      const top = node.offsetTop
      list.scrollTo({ top, behavior: Math.abs(top - list.scrollTop) > 1200 ? "auto" : "smooth" })
    }
    setActive(id)
  }

  function chooseTone(index: number) {
    setTone(index)
    store(TONE_KEY, index)
    setToneOpen(false)
  }

  const cell =
    "grid aspect-square place-items-center rounded-lg text-[26px] leading-none transition-transform duration-100 hover:bg-canvas active:scale-90 sm:text-[24px]"

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Emoji"
      className="animate-pop-in absolute bottom-full left-2 right-2 z-30 mb-2 flex h-[min(24rem,52dvh)] origin-bottom-left flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_16px_48px_rgba(18,20,28,0.16)] sm:left-3 sm:right-auto sm:w-[23.5rem]"
    >
      <div className="flex items-center gap-2 p-2.5 pb-2">
        <div className="relative min-w-0 flex-1">
          <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search emoji"
            aria-label="Search emoji"
            className="h-9 w-full rounded-xl bg-canvas pl-8 pr-3 text-[14px] text-ink outline-none placeholder:text-muted focus:shadow-[0_0_0_3px_rgba(26,43,74,0.10)]"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setToneOpen((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-canvas"
            aria-label="Skin tone"
            title="Skin tone"
          >
            <span className="text-[20px] leading-none">{tone >= 0 ? ["👋🏻", "👋🏼", "👋🏽", "👋🏾", "👋🏿"][tone] : "👋"}</span>
          </button>
          {toneOpen ? (
            <div className="animate-pop-in absolute right-0 top-full z-10 mt-1 flex gap-1 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
              {[-1, 0, 1, 2, 3, 4].map((index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => chooseTone(index)}
                  aria-label={index < 0 ? "Default skin tone" : `Skin tone ${index + 1}`}
                  aria-pressed={tone === index}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    tone === index ? "border-navy" : "border-transparent"
                  }`}
                  style={{ background: index < 0 ? "#fcc93a" : TONES[index] }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        {!catalog ? (
          <div className="grid grid-cols-8 gap-0.5 pt-6" aria-hidden="true">
            {Array.from({ length: 40 }, (_, i) => (
              <span key={i} className="m-1.5 aspect-square animate-pulse rounded-full bg-canvas" />
            ))}
          </div>
        ) : results ? (
          results.length ? (
            <div className="grid grid-cols-8 gap-0.5 pt-1">
              {results.map((item) => (
                <button type="button" key={item.e} onClick={() => pick(withTone(item))} className={cell} title={item.k.split(" ").slice(0, 3).join(" ")}>
                  {withTone(item)}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-[13px] text-muted">No emoji match “{search}”</p>
          )
        ) : (
          <>
            {recent.length ? (
              <section data-section="recent">
                <h3 className="sticky top-0 z-[1] bg-surface/95 px-1 py-1.5 text-[11.5px] font-semibold text-muted backdrop-blur">Recent</h3>
                <div className="grid grid-cols-8 gap-0.5">
                  {recent.map((emoji) => (
                    <button type="button" key={emoji} onClick={() => pick(emoji)} className={cell}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            {sections.map((section) => (
              <section key={section.id} data-section={section.id}>
                <h3 className="sticky top-0 z-[1] bg-surface/95 px-1 py-1.5 text-[11.5px] font-semibold text-muted backdrop-blur">
                  {section.name}
                </h3>
                <div className="grid grid-cols-8 gap-0.5">
                  {section.items.map((item) => (
                    <button type="button" key={item.e} onClick={() => pick(withTone(item))} className={cell} title={item.k.split(" ").slice(0, 3).join(" ")}>
                      {withTone(item)}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      <nav className="flex items-center justify-between gap-0.5 border-t border-line px-1.5 py-1" aria-label="Emoji categories">
        {CATEGORIES.filter((category) => category.id !== "recent" || recent.length).map(({ id, name, Icon }) => {
          const current = !results && active === id
          return (
            <button
              type="button"
              key={id}
              onClick={() => jump(id)}
              title={name}
              aria-label={name}
              aria-current={current}
              className={`relative grid h-9 flex-1 place-items-center rounded-lg transition-colors ${
                current ? "text-navy" : "text-muted hover:bg-canvas hover:text-ink"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span
                className={`absolute inset-x-2.5 bottom-0 h-[2px] rounded-full bg-navy transition-opacity ${current ? "opacity-100" : "opacity-0"}`}
              />
            </button>
          )
        })}
      </nav>
    </div>
  )
}
