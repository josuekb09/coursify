import EducatorCard from "@/components/educator-card"
import { institutionLabels, subjectOptions } from "@/data"
import { useApp } from "@/store"
import type { InstitutionLevel, Subject } from "@/types"
import { educatorMatchesQuery } from "@/utils"
import { useMemo, useState } from "react"

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
  const [level, setLevel] = useState<"All" | InstitutionLevel>("All")
  const [subject, setSubject] = useState<"All" | Subject>("All")

  const filtered = useMemo(() => {
    return educators.filter((educator) => {
      if (educator.id === currentUser?.id) return false
      if (level !== "All" && educator.institutionLevel !== level) return false
      if (subject !== "All" && educator.subject !== subject) return false
      return educatorMatchesQuery(educator, query)
    })
  }, [currentUser?.id, educators, level, query, subject])

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em] text-ink">Discover colleagues</h1>
      <p className="mt-1 text-sm text-muted">
        Browse verified high school and university educators. Follow to see their updates in your feed.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(["All", "high-school", "university"] as const).map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setLevel(item)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
              level === item
                ? "border-navy bg-navy text-white"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {item === "All" ? "All institutions" : institutionLabels[item]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSubject("All")}
          className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
            subject === "All"
              ? "border-navy bg-navy text-white"
              : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
          }`}
        >
          All subjects
        </button>
        {subjectOptions.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setSubject(item)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
              subject === item
                ? "border-navy bg-navy text-white"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

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
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface p-12 text-center">
          <p className="font-display text-[15px] font-semibold text-ink">No colleagues match these filters.</p>
          <p className="mt-1 text-sm text-muted">
            Invite another educator to create an account on this device, or clear the search.
          </p>
        </div>
      ) : null}
    </main>
  )
}
