import EducatorCard from "@/components/educator-card"
import Icons from "@/components/icons"
import { institutionLabels, subjectOptions } from "@/data"
import { isFounderEmail } from "@/security"
import { useApp } from "@/store"
import type { InstitutionLevel, Subject } from "@/types"
import { educatorMatchesQuery, rankEducatorSearchResults } from "@/utils"
import { useEffect, useMemo, useState } from "react"

const POPULAR_SUBJECTS: Subject[] = [
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Computer Science & IT",
  "Literature & Language Arts",
  "History",
  "Economics & Business",
]

export default function DirectoryView({
  query,
  onAuthor,
  onMessage,
}: {
  query: string
  onAuthor: (id: string) => void
  onMessage: (id: string) => void
}) {
  const { currentUser, educators } = useApp()
  const [search, setSearch] = useState(query || "")
  const [level, setLevel] = useState<"All" | InstitutionLevel>("All")
  const [subject, setSubject] = useState<"All" | Subject>("All")

  useEffect(() => {
    if (query) setSearch(query)
  }, [query])

  const hasSearchFilter = search.trim().length >= 1 || subject !== "All" || level !== "All"

  const filtered = useMemo(() => {
    if (!hasSearchFilter) return []
    const needle = search.trim()
    const matches = educators.filter((educator) => {
      if (level !== "All" && educator.institutionLevel !== level) return false
      if (subject !== "All" && educator.subject !== subject) return false
      if (needle) {
        return educatorMatchesQuery(educator, needle)
      }
      return true
    })
    return rankEducatorSearchResults(matches, needle, currentUser?.id)
  }, [currentUser?.id, educators, hasSearchFilter, level, search, subject])

  const disciplineCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const edu of educators) {
      map[edu.subject] = (map[edu.subject] ?? 0) + 1
    }
    return map
  }, [educators])

  function handleClear() {
    setSearch("")
    setSubject("All")
    setLevel("All")
  }

  function handlePickSubject(s: Subject) {
    setSubject(s)
  }

  function handleQuickSearch(term: string) {
    setSearch(term)
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Header */}
      <div className="max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/20 bg-navy/5 px-3 py-1 font-mono text-[11px] font-semibold text-navy">
            <Icons.Users className="h-3.5 w-3.5" />
            Faculty & Academic Network
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-muted">
            <Icons.Shield className="h-3 w-3 text-sky-600" />
            Verified & Protected
          </span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl lg:text-4xl">
          Discover & Connect with Colleagues
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted sm:text-[15px]">
          Search verified educators across high schools and universities worldwide. Exchange curriculum, collaborate on lesson design, and follow academic peers.
        </p>
      </div>

      {/* Prominent Search Bar */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex h-13 flex-1 items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-[0_4px_24px_rgba(18,20,28,0.05)] transition-all focus-within:border-navy focus-within:shadow-[0_0_0_4px_rgba(26,43,74,0.1)]">
          <Icons.Search className="h-5 w-5 shrink-0 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search educator by full name, subject, university, or keyword…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/80 font-medium"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink transition"
              aria-label="Clear search query"
            >
              <Icons.Close className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        {hasSearchFilter ? (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3.5 text-xs font-semibold text-muted hover:border-line-strong hover:text-ink transition shadow-2xs"
          >
            <Icons.Close className="h-3.5 w-3.5" />
            <span>Reset filters</span>
          </button>
        ) : null}
      </div>

      {/* Filter Row: Level & Disciplines */}
      <div className="mt-5 space-y-3">
        {/* Institution Level Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-muted mr-1">Level:</span>
          {(["All", "high-school", "university"] as const).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setLevel(item)}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                level === item
                  ? "border-navy bg-navy text-white shadow-2xs"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {item === "All" ? "All institutions" : institutionLabels[item]}
            </button>
          ))}
        </div>

        {/* Subject Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-muted mr-1">Discipline:</span>
          <button
            type="button"
            onClick={() => setSubject("All")}
            className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
              subject === "All"
                ? "border-navy bg-navy text-white shadow-2xs"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            All subjects
          </button>
          {POPULAR_SUBJECTS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSubject(subject === s ? "All" : s)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                subject === s
                  ? "border-navy bg-navy text-white shadow-2xs"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
          {/* Subject Dropdown for all other subjects */}
          <select
            value={POPULAR_SUBJECTS.includes(subject as Subject) ? "" : subject}
            onChange={(e) => setSubject((e.target.value as Subject) || "All")}
            aria-label="More academic disciplines"
            className="h-7 rounded-full border border-line bg-surface px-2.5 text-[11px] font-medium text-muted outline-none hover:border-line-strong focus:border-navy"
          >
            <option value="">More subjects…</option>
            {subjectOptions
              .filter((s) => !POPULAR_SUBJECTS.includes(s))
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* When Search / Filter is Active: Show Results */}
      {hasSearchFilter ? (
        <section className="mt-8">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <p className="font-mono text-xs text-muted">
              Found <strong className="text-ink">{filtered.length}</strong>{" "}
              {filtered.length === 1 ? "educator" : "educators"} matching your criteria
            </p>
          </div>

          {filtered.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((educator) => (
                <EducatorCard
                  key={educator.id}
                  educator={educator}
                  onProfile={onAuthor}
                  onMessage={onMessage}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center shadow-xs">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-canvas text-muted">
                <Icons.Search className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-ink">No educators matched your query</h2>
              <p className="mt-1 text-sm text-muted max-w-md mx-auto">
                Try searching for a broader term, switching institution levels, or selecting &quot;All subjects&quot;.
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-navy-hover transition"
              >
                <Icons.Close className="h-3.5 w-3.5" />
                <span>Clear all filters</span>
              </button>
            </div>
          )}
        </section>
      ) : (
        /* Default Inspiring State: Clean Privacy-First Search Launchpad */
        <div className="mt-10 space-y-10">
          {/* Search Guidance Card */}
          <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-canvas p-6 sm:p-10 shadow-sm">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-navy text-white shadow-sm">
                  <Icons.Search className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-navy">
                  Privacy-First Faculty Search
                </span>
              </div>

              <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
                Find and connect with educators worldwide
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                To protect faculty privacy and prevent unsolicited web scraping, member directories are shielded by default. Enter an educator&apos;s full name, school or university, or academic field in the search bar above to view matching profiles.
              </p>

              {/* Quick Search Suggestions */}
              <div className="mt-6">
                <p className="font-mono text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Suggested Search Queries:
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {[
                    "Computer Science & IT",
                    "Mathematics",
                    "Physics",
                    "Biology",
                    "Literature & Language Arts",
                    "Economics & Business",
                    "University",
                    "High School",
                  ].map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() => handleQuickSearch(chip)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas/70 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-navy hover:bg-surface hover:text-navy active:scale-98"
                    >
                      <Icons.Search className="h-3 w-3 opacity-60" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Trending Academic Disciplines Grid */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Explore by Academic Discipline</h2>
                <p className="mt-1 text-xs text-muted">
                  Select a department to browse active colleagues and lesson collections.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {POPULAR_SUBJECTS.map((sub) => {
                const count = disciplineCounts[sub] ?? 0
                return (
                  <button
                    type="button"
                    key={sub}
                    onClick={() => handlePickSubject(sub)}
                    className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-navy/40 hover:shadow-md"
                  >
                    <div>
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted group-hover:text-navy transition-colors">
                        Department
                      </span>
                      <h3 className="mt-1 text-sm font-bold text-ink group-hover:text-navy transition-colors line-clamp-1">
                        {sub}
                      </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-line/50 pt-2 text-[11px] text-muted">
                      <span>{count} {count === 1 ? "educator" : "educators"}</span>
                      <span className="text-navy opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Institutional Trust & Privacy Architecture */}
          <section className="rounded-2xl border border-line bg-gradient-to-br from-surface via-surface to-canvas p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy/5 text-navy">
                  <Icons.Shield className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink">Zero Public Scraping</h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Profiles and contact coordinates are shielded from bots and public roster harvesting.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy/5 text-navy">
                  <Icons.VerifiedSeal className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink">Merit-Based Seals</h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Verified badges require verified credentials and active curriculum publishing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy/5 text-navy">
                  <Icons.Message className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink">Direct Faculty Messaging</h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Reach educators directly in end-to-end synchronized chat without leaving your workflow.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
