import { ResourceFeed } from "@/components/dashboard"
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
  const { myResources } = useApp()
  const [subject, setSubject] = useState("Mathematics")
  const filtered = useMemo(
    () => filterResources(myResources, query, subject),
    [myResources, query, subject],
  )

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[-0.03em] text-ink">Subjects</h1>
        <p className="mt-1 text-sm text-muted">
          Filter your own library by academic subject.
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {subjects
          .filter((item) => item !== "All")
          .map((item) => {
            const count = myResources.filter((resource) => resource.subject === item).length
            const downloads = myResources
              .filter((resource) => resource.subject === item)
              .reduce((sum, resource) => sum + resource.downloads, 0)
            return (
              <button
                type="button"
                key={item}
                onClick={() => setSubject(item)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  subject === item
                    ? "border-navy/20 bg-surface ring-2 ring-navy/10"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <p className="text-sm font-semibold text-ink">{item}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {count} {count === 1 ? "material" : "materials"} · {formatCount(downloads)}{" "}
                  {downloads === 1 ? "download" : "downloads"}
                </p>
              </button>
            )
          })}
      </div>
      <ResourceFeed
        title={subject}
        subtitle="Your materials tagged to this subject."
        resources={filtered}
        subject={subject}
        onSubject={setSubject}
        onAuthor={onAuthor}
        showAll={false}
        empty={`No ${subject} materials yet.`}
        emptyHint="Upload a resource and tag it with this subject."
      />
    </main>
  )
}
