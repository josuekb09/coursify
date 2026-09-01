import Avatar from "@/components/avatar"
import FormatMark from "@/components/format-mark"
import Icons from "@/components/icons"
import {
  dataUrlToBlob,
  isDocxFile,
  parseDocxFromDataUrl,
} from "@/documents"
import {
  decodeDataUrlText,
  formatBadge,
  isCsvResource,
  isDirectMediaUrl,
  isPdfResource,
  isTextDocument,
  isVideoFile,
  parseCsvPreview,
  parseGitHubRepo,
  sourceKindLabel,
  videoEmbedUrl,
} from "@/formats"
import { useApp } from "@/store"
import type { Resource } from "@/types"
import { deliverResource } from "@/utils"
import { useEffect, useState } from "react"

export default function ResourcePreview({
  resource,
  onClose,
}: {
  resource: Resource
  onClose: () => void
}) {
  const { currentUser, downloadResource, toggleSave, isSaved, authorName, educatorById, notify } =
    useApp()
  const saved = isSaved(resource.id)
  const authorEducator = educatorById(resource.authorId)
  const author = authorEducator?.name ?? authorName(resource.authorId)
  const isLink = Boolean(resource.sourceUrl && !resource.fileData)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  function handleDownload() {
    const next = downloadResource(resource.id)
    const current = next ?? resource
    const action = deliverResource(current, author)
    notify(action === "open" ? `Opening ${current.title}` : `Downloading ${current.title}`)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4 lg:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-navy/45"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative flex max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.2)] sm:max-h-[94vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-navy">
                <FormatMark format={resource.format} className="h-3.5 w-3.5" />
                {formatBadge(resource.format)}
              </span>
              <span className="font-mono text-[11px] text-muted">{sourceKindLabel(resource)}</span>
              <span className="font-mono text-[11px] text-muted">{resource.grade}</span>
            </div>
            <h2 className="mt-2 font-display text-[18px] font-bold leading-snug tracking-[-0.02em] text-ink sm:text-[20px]">
              {resource.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-2 text-ink">
                {authorEducator ? (
                  <Avatar educator={authorEducator} size={22} rounded="rounded-full" />
                ) : null}
                {author}
                {authorEducator?.verified ? (
                  <Icons.VerifiedSeal className="h-3.5 w-3.5 text-navy" />
                ) : null}
              </span>
              <span>{resource.subject}</span>
              {resource.fileName ? (
                <span className="max-w-full truncate font-mono text-[12px]">{resource.fileName}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink hover:bg-canvas"
            aria-label="Close"
            onClick={onClose}
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas p-3 sm:p-6">
          <PreviewCanvas resource={resource} author={author} />
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 sm:px-6 sm:py-4">
          <p className="font-mono text-[11px] text-muted">
            {resource.downloads.toLocaleString()} downloads
            {resource.fileSize ? ` · ${resource.fileSize}` : ""}
          </p>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  toggleSave(resource.id)
                  notify(saved ? "Removed from Saved" : "Saved to your library")
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-[13px] font-medium text-ink hover:border-line-strong"
              >
                <Icons.Bookmark className="h-4 w-4 text-navy" filled={saved} />
                {saved ? "Saved" : "Save"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-navy px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover"
            >
              {isLink ? <Icons.Link className="h-4 w-4" /> : <Icons.Download className="h-4 w-4" />}
              {isLink ? "Open original" : "Download"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function useObjectUrl(dataUrl?: string) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!dataUrl) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(dataUrlToBlob(dataUrl))
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [dataUrl])
  return url
}

function PreviewCanvas({ resource, author }: { resource: Resource; author: string }) {
  const embed = resource.sourceUrl ? videoEmbedUrl(resource.sourceUrl) : null
  const github = resource.sourceUrl ? parseGitHubRepo(resource.sourceUrl) : null

  if (resource.format === "video" && embed) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-ink shadow-sm">
        <div className="aspect-video">
          <iframe
            src={embed}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    )
  }

  if (resource.format === "video" && resource.fileData && isVideoFile(resource)) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-ink">
        <video src={resource.fileData} controls className="aspect-video w-full">
          Your browser cannot play this video file.
        </video>
      </div>
    )
  }

  if (resource.format === "video" && resource.sourceUrl && isDirectMediaUrl(resource.sourceUrl, ["mp4", "webm"])) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-ink">
        <video src={resource.sourceUrl} controls className="aspect-video w-full" />
      </div>
    )
  }

  if (resource.fileData && isPdfResource(resource)) {
    return <PdfStage dataUrl={resource.fileData} title={resource.title} />
  }

  if (resource.fileData && isCsvResource(resource)) {
    const rows = parseCsvPreview(decodeDataUrlText(resource.fileData))
    if (rows.length === 0) {
      return (
        <FileNotice
          title={resource.fileName ?? resource.title}
          body="This spreadsheet is stored in your library. Download it to open the full workbook."
        />
      )
    }
    const header = rows[0]
    const body = rows.slice(1)
    return (
      <div className="overflow-auto rounded-xl border border-line bg-surface">
        <table className="min-w-full border-collapse text-left text-[13px]">
          <thead className="bg-navy text-white">
            <tr>
              {header.map((cell, index) => (
                <th key={`${cell}-${index}`} className="px-3 py-2.5 font-medium">
                  {cell || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-line odd:bg-canvas">
                {header.map((_, colIndex) => (
                  <td key={colIndex} className="px-3 py-2 font-mono text-[12px] text-ink">
                    {row[colIndex] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (resource.fileData && isTextDocument(resource)) {
    const text = decodeDataUrlText(resource.fileData)
    return (
      <article className="rounded-xl border border-line bg-surface px-5 py-6 sm:px-10 sm:py-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Document preview</p>
        <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-ink/90">
          {text || "This text file is empty."}
        </pre>
      </article>
    )
  }

  if (resource.fileData && isDocxFile(resource)) {
    return <DocxStage dataUrl={resource.fileData} />
  }

  if (resource.format === "slides") {
    return (
      <FileNotice
        title={resource.fileName ?? resource.title}
        body="Slide preview is not available yet. Download the file to open it in PowerPoint, Keynote, or your preferred presentation app."
        meta={resource.fileSize ? `${resource.fileSize} · ${resource.grade}` : resource.grade}
      />
    )
  }

  if (resource.format === "code" && github) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface p-5 sm:p-6">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-navy-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-navy">
          <Icons.Code className="h-3.5 w-3.5" />
          GitHub
        </span>
        <h3 className="mt-4 font-display text-xl font-bold tracking-[-0.02em] text-ink">
          {github.owner}/{github.repo}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Project archive linked from this resource. Open the repository to browse source files,
          issues, and classroom starter code.
        </p>
        <p className="mt-4 break-all font-mono text-[12px] text-navy">{github.href}</p>
      </div>
    )
  }

  if (resource.format === "code") {
    return (
      <FileNotice
        title={resource.fileName ?? "Project archive"}
        body="ZIP archives stay in your Coursify library. Download to unpack the project on your machine."
        meta={resource.fileSize}
      />
    )
  }

  if (resource.format === "spreadsheet") {
    return (
      <FileNotice
        title={resource.fileName ?? resource.title}
        body="Workbook files are stored in your library. Download to open the original spreadsheet."
        meta={`${resource.subject} · ${resource.grade}`}
      />
    )
  }

  return (
    <FileNotice
      title={resource.title}
      body={
        resource.fileName
          ? `${resource.fileName} is stored in your library. Use Download to open the original file.`
          : resource.sourceUrl
            ? "This material is linked from an external source. Use Open original to view the full document."
            : "This material is stored in your Coursify library."
      }
      meta={`${author} · ${resource.subject} · ${resource.grade}`}
    />
  )
}

function PdfStage({ dataUrl, title }: { dataUrl: string; title: string }) {
  const url = useObjectUrl(dataUrl)
  if (!url) {
    return <p className="py-16 text-center font-mono text-[12px] text-muted">Opening document…</p>
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <iframe
        title={title}
        src={`${url}#toolbar=1&navpanes=0`}
        className="h-[min(70dvh,640px)] w-full bg-canvas"
      />
    </div>
  )
}

function DocxStage({ dataUrl }: { dataUrl: string }) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    parseDocxFromDataUrl(dataUrl)
      .then((value) => {
        if (!cancelled) setText(value)
      })
      .catch(() => {
        if (!cancelled) setError("Could not read this Word document. Download it to open the original file.")
      })
    return () => {
      cancelled = true
    }
  }, [dataUrl])

  if (error) return <FileNotice title="Document" body={error} />
  if (text === null) {
    return <p className="py-16 text-center font-mono text-[12px] text-muted">Reading document…</p>
  }
  if (!text) {
    return (
      <FileNotice
        title="Document"
        body="This Word file has no readable text. Download it to open the original document."
      />
    )
  }
  return (
    <article className="rounded-xl border border-line bg-surface px-5 py-6 sm:px-10 sm:py-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Document preview</p>
      <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-ink/90">
        {text}
      </pre>
    </article>
  )
}

function FileNotice({ title, body, meta }: { title: string; body: string; meta?: string }) {
  return (
    <article className="mx-auto max-w-2xl rounded-xl border border-line bg-surface px-5 py-6 sm:px-10 sm:py-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">File preview</p>
      <h3 className="mt-3 break-words font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
        {title}
      </h3>
      {meta ? <p className="mt-2 text-[13px] text-muted">{meta}</p> : null}
      <p className="mt-4 text-[14px] leading-relaxed text-ink/80">{body}</p>
    </article>
  )
}
