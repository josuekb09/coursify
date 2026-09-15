import { ResourceFeed } from "@/components/dashboard"
import Icons from "@/components/icons"
import { subjects } from "@/data"
import { useApp } from "@/store"
import { filterResources, formatCount } from "@/utils"
import { useMemo, useState } from "react"

export default function SubjectsView({
  query,
  onAuthor,
}: {
  query: string
  onAuthor: (id: string) => void
}) {
  const { resources, myResources } = useApp()
  const [scope, setScope] = useState<"community" | "mine">("community")
  const [subject, setSubject] = useState("Mathematics")

  const targetPool = scope === "community" ? resources : myResources

  const filtered = useMemo(
    () => filterResources(targetPool, query, subject),
    [targetPool, query, subject],
  )

  const counts = useMemo(() => {
    const map: Record<string, { count: number; downloads: number }> = {}
    for (const item of targetPool) {
      if (!map[item.subject]) {
        map[item.subject] = { count: 0, downloads: 0 }
      }
      map[item.subject].count += 1
      map[item.subject].downloads += item.downloads
    }
    return map
  }, [targetPool])

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-navy/20 bg-navy/5 px-3 py-1 font-mono text-[11px] font-semibold text-navy">
              <Icons.Layers className="h-3.5 w-3.5" />
              GitHub for Educators
            </span>
            <span className="font-mono text-[11px] text-muted">Curriculum Repositories</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Curriculum Disciplines & Subjects
          </h1>
          <p className="mt-1 text-sm text-muted">
            Explore shared lesson plans, slide decks, and collections organized by academic subject.
          </p>
        </div>

        {/* Scope Selector: Community Curriculum vs My Materials */}
        <div className="inline-flex shrink-0 rounded-xl border border-line bg-surface p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setScope("community")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              scope === "community"
                ? "bg-navy text-white shadow-2xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Icons.Globe className="h-3.5 w-3.5" />
            <span>Community ({resources.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              scope === "mine"
                ? "bg-navy text-white shadow-2xs"
                : "text-muted hover:text-ink"
            }`}
          >
            <Icons.Folder className="h-3.5 w-3.5" />
            <span>My Materials ({myResources.length})</span>
          </button>
        </div>
      </div>

      {/* Grid of Subject Cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subjects
          .filter((item) => item !== "All")
          .map((item) => {
            const data = counts[item] ?? { count: 0, downloads: 0 }
            const active = subject === item
            return (
              <button
                type="button"
                key={item}
                onClick={() => setSubject(item)}
                className={`group rounded-xl border p-4 text-left transition-all hover:border-line-strong ${
                  active
                    ? "border-navy/30 bg-surface ring-2 ring-navy/15 shadow-xs"
                    : "border-line bg-surface hover:bg-canvas/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-bold ${active ? "text-navy" : "text-ink group-hover:text-navy"}`}>
                    {item}
                  </p>
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-mono font-bold ${
                    active ? "bg-navy text-white" : "bg-canvas text-muted"
                  }`}>
                    {data.count}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-muted">
                  {data.count} {data.count === 1 ? "resource" : "resources"} · {formatCount(data.downloads)} {data.downloads === 1 ? "download" : "downloads"}
                </p>
              </button>
            )
          })}
      </div>

      <ResourceFeed
        title={`${subject} Resources`}
        subtitle={
          scope === "community"
            ? `Shared academic curriculum materials and lesson repositories tagged to ${subject}.`
            : `Your personal library materials tagged to ${subject}.`
        }
        resources={filtered}
        subject={subject}
        onSubject={setSubject}
        onAuthor={onAuthor}
        showAll={false}
        empty={`No ${subject} materials found.`}
        emptyHint={
          scope === "community"
            ? "Be the first educator to share curriculum in this discipline."
            : "Upload a resource to add it to this subject in your library."
        }
      />
    </main>
  )
}
