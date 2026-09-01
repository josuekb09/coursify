import Icons from "@/components/icons"
import { subjectOptions } from "@/data"
import type { Subject } from "@/types"
import { useEffect, useId, useMemo, useRef, useState } from "react"

const fieldFocus =
  "border-line bg-canvas outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"

export default function SubjectPicker({
  value,
  onChange,
  id,
}: {
  value: Subject
  onChange: (subject: Subject) => void
  id?: string
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return subjectOptions
    return subjectOptions.filter((item) => item.toLowerCase().includes(needle))
  }, [query])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={inputId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3.5 text-left text-sm text-ink ${fieldFocus}`}
      >
        <span className="truncate">{value}</span>
        <Icons.Chevron className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[0_16px_48px_rgba(18,20,28,0.12)]">
          <div className="border-b border-line p-2">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-2.5">
              <Icons.Search className="h-4 w-4 text-muted" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search subjects…"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
            </label>
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.map((item) => {
              const selected = item === value
              return (
                <li key={item}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(item)
                      setOpen(false)
                      setQuery("")
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm ${
                      selected ? "bg-navy-soft font-medium text-navy" : "text-ink hover:bg-canvas"
                    }`}
                  >
                    {item}
                    {selected ? <Icons.Check className="h-4 w-4" /> : null}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 ? (
              <li className="px-3.5 py-3 text-sm text-muted">No subjects match that search.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
