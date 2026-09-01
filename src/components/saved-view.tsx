import { ResourceFeed } from "@/components/dashboard"
import { useApp } from "@/store"
import { filterResources } from "@/utils"
import { useMemo, useState } from "react"

export default function SavedView({
  query,
  onAuthor,
}: {
  query: string
  onAuthor: (id: string) => void
}) {
  const { savedResources } = useApp()
  const [subject, setSubject] = useState("All")
  const filtered = useMemo(
    () => filterResources(savedResources, query, subject),
    [query, savedResources, subject],
  )

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <ResourceFeed
        title="Saved"
        subtitle="Resources you have explicitly bookmarked."
        resources={filtered}
        subject={subject}
        onSubject={setSubject}
        onAuthor={onAuthor}
        empty="Nothing saved yet."
        emptyHint="Bookmark a resource from your library to keep it here."
      />
    </main>
  )
}
