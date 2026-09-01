import { ResourceFeed } from "@/components/dashboard"
import { useApp } from "@/store"
import { filterResources } from "@/utils"
import { useMemo, useState } from "react"

export default function UploadsView({
  query,
  onAuthor,
}: {
  query: string
  onAuthor: (id: string) => void
}) {
  const { myResources } = useApp()
  const [subject, setSubject] = useState("All")
  const filtered = useMemo(
    () => filterResources(myResources, query, subject),
    [myResources, query, subject],
  )

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <ResourceFeed
        title="My Uploads"
        subtitle="Manage the materials you have added to Coursify. Delete anything you no longer need."
        resources={filtered}
        subject={subject}
        onSubject={setSubject}
        onAuthor={onAuthor}
        empty="You have not uploaded any materials yet."
        emptyHint="Use Upload resource to add a file or a link."
      />
    </main>
  )
}
