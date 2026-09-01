import Avatar from "@/components/avatar"
import FormatMark from "@/components/format-mark"
import Icons from "@/components/icons"
import ResourcePreview from "@/components/resource-preview"
import { subjectTint } from "@/data"
import { formatBadge, inferResourceFormat, sourceKindLabel } from "@/formats"
import { useApp } from "@/store"
import type { Resource } from "@/types"
import { deliverResource } from "@/utils"
import { useState } from "react"
import { createPortal } from "react-dom"

export default function ResourceCard({
  resource,
  compact = false,
  onAuthor,
}: {
  resource: Resource
  compact?: boolean
  onAuthor?: (authorId: string) => void
}) {
  const { currentUser, downloadResource, deleteResource, toggleSave, isSaved, authorName, educatorById, notify } =
    useApp()
  const [previewOpen, setPreviewOpen] = useState(false)
  const saved = isSaved(resource.id)
  const authorEducator = educatorById(resource.authorId)
  const author = authorEducator?.name ?? authorName(resource.authorId)
  const isOwner = currentUser?.id === resource.authorId
  const format = resource.format ?? inferResourceFormat(resource)
  const isLink = Boolean(resource.sourceUrl && !resource.fileData)
  const isSlides = format === "slides"

  function handleDownload() {
    const next = downloadResource(resource.id)
    const current = next ?? resource
    const action = deliverResource(current, author)
    notify(action === "open" ? `Opening ${current.title}` : `Downloading ${current.title}`)
  }

  return (
    <>
      <article
        className={`group flex flex-col rounded-xl border border-line bg-surface p-5 transition-all hover:border-line-strong hover:-translate-y-0.5 ${
          isSlides ? "" : "cursor-pointer"
        }`}
        onClick={() => {
          if (!isSlides) setPreviewOpen(true)
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`rounded-md px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${
              subjectTint[resource.subject] ?? "bg-navy-soft text-navy"
            }`}
          >
            {resource.subject}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-canvas px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-navy">
            <FormatMark format={format} className="h-3 w-3" />
            {formatBadge(format)}
          </span>
        </div>

        <h3 className="mt-4 font-display text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          {resource.title}
        </h3>

        {!compact ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onAuthor?.(resource.authorId)
            }}
            className="mt-2 flex items-center gap-2 text-left text-[13px] text-muted hover:text-ink"
          >
            <span className="flex items-center gap-2">
              {authorEducator ? (
                <Avatar educator={authorEducator} size={20} rounded="rounded-full" />
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-navy-soft font-mono text-[9px] font-semibold text-navy">
                  {author.slice(0, 1)}
                </span>
              )}
              {author}
              {authorEducator?.verified ? (
                <Icons.VerifiedSeal className="h-3.5 w-3.5 text-navy" />
              ) : null}
            </span>
          </button>
        ) : null}

        <p className="mt-auto flex items-center gap-2 pt-4 text-[12px] text-muted">
          <span>{resource.grade}</span>
          <span aria-hidden="true">·</span>
          <span>{sourceKindLabel({ ...resource, format })}</span>
          {resource.fileName ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{resource.fileName}</span>
            </>
          ) : null}
        </p>

        <div
          className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="flex items-center gap-1.5 font-mono text-[12px] text-muted">
            <Icons.Download className="h-3.5 w-3.5" />
            {resource.downloads.toLocaleString()}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {!isSlides ? (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-[13px] font-medium text-ink hover:border-line-strong"
              >
                <Icons.Eye className="h-4 w-4 text-navy" />
                Preview
              </button>
            ) : null}
            <button
              type="button"
              aria-label={saved ? "Unsave resource" : "Save resource"}
              onClick={() => {
                toggleSave(resource.id)
                notify(saved ? "Removed from Saved" : "Saved to your library")
              }}
              className="grid h-10 w-10 place-items-center rounded-lg border border-line text-navy hover:border-line-strong"
            >
              <Icons.Bookmark className="h-4 w-4" filled={saved} />
            </button>
            {isOwner ? (
              <button
                type="button"
                aria-label="Delete resource"
                onClick={() => {
                  if (window.confirm(`Remove “${resource.title}” from your library?`)) {
                    deleteResource(resource.id)
                  }
                }}
                className="grid h-10 w-10 place-items-center rounded-lg border border-line text-navy hover:border-line-strong"
              >
                <Icons.Trash className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-navy px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-navy-hover"
            >
              {isLink ? <Icons.Link className="h-4 w-4" /> : <Icons.Download className="h-4 w-4" />}
              {isLink ? "Open" : "Download"}
            </button>
          </div>
        </div>
      </article>

      {previewOpen
        ? createPortal(
            <ResourcePreview resource={resource} onClose={() => setPreviewOpen(false)} />,
            document.body,
          )
        : null}
    </>
  )
}
