import ResourceCard from "@/components/resource-card"
import { subjects } from "@/data"
import type { Resource } from "@/types"

export default function ResourceFeed({
  title,
  subtitle,
  resources,
  subject,
  onSubject,
  onAuthor,
  empty = "No resources match your filters.",
  emptyHint = "Try a different subject or clear the search.",
  showAll = true,
}: {
  title: string
  subtitle: string
  resources: Resource[]
  subject: string
  onSubject: (value: string) => void
  onAuthor?: (id: string) => void
  empty?: string
  emptyHint?: string
  showAll?: boolean
}) {
  const chips = showAll ? subjects : subjects.filter((item) => item !== "All")
  return (
    <section id="resource-feed" className="mt-10">
      <div>
        <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {chips.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onSubject(item)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                subject === item
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} onAuthor={onAuthor} />
        ))}
      </div>

      {resources.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line-strong bg-surface p-12 text-center">
          <p className="font-display text-[15px] font-semibold text-ink">{empty}</p>
          <p className="mt-1 text-sm text-muted">{emptyHint}</p>
        </div>
      ) : null}
    </section>
  )
}
