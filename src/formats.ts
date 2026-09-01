import type { Resource, ResourceFormat, UploadInput } from "@/types"

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export const FORMAT_ORDER: ResourceFormat[] = [
  "video",
  "slides",
  "document",
  "spreadsheet",
  "code",
]

const EXT_TO_FORMAT: Record<string, ResourceFormat> = {
  mp4: "video",
  webm: "video",
  ppt: "slides",
  pptx: "slides",
  key: "slides",
  pdf: "document",
  doc: "document",
  docx: "document",
  txt: "document",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  csv: "spreadsheet",
  zip: "code",
}

const FORMAT_EXTS: Record<ResourceFormat, string[]> = {
  video: ["mp4", "webm"],
  slides: ["ppt", "pptx", "key"],
  document: ["pdf", "doc", "docx", "txt"],
  spreadsheet: ["xls", "xlsx", "csv"],
  code: ["zip"],
}

export const FORMAT_META: Record<
  ResourceFormat,
  { label: string; badge: string; hint: string; linkHint: string; accept: string }
> = {
  video: {
    label: "Video lecture",
    badge: "Video",
    hint: "MP4 or WebM, under 4 MB, or a YouTube / Vimeo link.",
    linkHint: "https://youtube.com/watch?v= or https://vimeo.com/",
    accept: ".mp4,.webm,video/mp4,video/webm",
  },
  slides: {
    label: "Slide deck",
    badge: "Slides",
    hint: "PPTX presentation. Download to open in PowerPoint or Keynote.",
    linkHint: "https:// link to the original deck",
    accept: ".ppt,.pptx,.key",
  },
  document: {
    label: "Document",
    badge: "Document",
    hint: "PDF or DOCX reading material.",
    linkHint: "https:// link to the original document",
    accept: ".pdf,.doc,.docx,.txt,application/pdf",
  },
  spreadsheet: {
    label: "Spreadsheet",
    badge: "Data",
    hint: "XLSX or CSV data set.",
    linkHint: "https:// link to the original sheet",
    accept: ".xls,.xlsx,.csv,text/csv",
  },
  code: {
    label: "Code archive",
    badge: "Code",
    hint: "ZIP project archive or a GitHub repository link.",
    linkHint: "https://github.com/org/repo",
    accept: ".zip,application/zip",
  },
}

export const UPLOAD_ACCEPT = FORMAT_ORDER.flatMap((format) => FORMAT_META[format].accept.split(","))
  .filter((item, index, all) => all.indexOf(item) === index)
  .join(",")

export function isResourceFormat(value: unknown): value is ResourceFormat {
  return value === "video" || value === "slides" || value === "document" || value === "spreadsheet" || value === "code"
}

export function extensionOf(name: string) {
  const base = name.split(/[?#]/)[0] ?? name
  const dot = base.lastIndexOf(".")
  if (dot < 0 || dot === base.length - 1) return ""
  return base.slice(dot + 1).toLowerCase()
}

export function formatLabel(format: ResourceFormat) {
  return FORMAT_META[format].label
}

export function formatBadge(format: ResourceFormat) {
  return FORMAT_META[format].badge
}

export function formatFromExtension(name: string): ResourceFormat | null {
  const ext = extensionOf(name)
  return ext ? (EXT_TO_FORMAT[ext] ?? null) : null
}

export function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0]
      return id ? id.slice(0, 11) : null
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.searchParams.get("v")) return parsed.searchParams.get("v")
      const parts = parsed.pathname.split("/").filter(Boolean)
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) {
        return parts[1]
      }
    }
    return null
  } catch {
    return null
  }
}

export function vimeoVideoId(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null
    const parts = parsed.pathname.split("/").filter(Boolean)
    const id = host === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0]
    return id && /^\d+$/.test(id) ? id : null
  } catch {
    return null
  }
}

export function parseGitHubRepo(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")
    if (host !== "github.com") return null
    const parts = parsed.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null
    const owner = parts[0]
    const repo = parts[1].replace(/\.git$/i, "")
    if (!owner || !repo) return null
    return { owner, repo, href: `https://github.com/${owner}/${repo}` }
  } catch {
    return null
  }
}

export function isDirectMediaUrl(url: string, extensions: string[]) {
  try {
    const parsed = new URL(url)
    const ext = extensionOf(parsed.pathname)
    return extensions.includes(ext)
  } catch {
    return false
  }
}

export function inferFormatFromUrl(url: string): ResourceFormat | null {
  if (!isHttpUrl(url)) return null
  if (youtubeVideoId(url) || vimeoVideoId(url) || isDirectMediaUrl(url, FORMAT_EXTS.video)) return "video"
  if (parseGitHubRepo(url) || isDirectMediaUrl(url, FORMAT_EXTS.code)) return "code"
  if (isDirectMediaUrl(url, FORMAT_EXTS.slides)) return "slides"
  if (isDirectMediaUrl(url, FORMAT_EXTS.spreadsheet)) return "spreadsheet"
  if (isDirectMediaUrl(url, FORMAT_EXTS.document)) return "document"
  return null
}

export function inferResourceFormat(resource: {
  format?: string
  fileName?: string
  sourceUrl?: string
  type?: string
  mimeType?: string
}): ResourceFormat {
  if (isResourceFormat(resource.format)) return resource.format
  if (resource.mimeType?.startsWith("video/")) return "video"
  if (resource.fileName) {
    const fromFile = formatFromExtension(resource.fileName)
    if (fromFile) return fromFile
  }
  if (resource.sourceUrl) {
    const fromUrl = inferFormatFromUrl(resource.sourceUrl)
    if (fromUrl) return fromUrl
  }
  const type = (resource.type ?? "").toLowerCase()
  if (/(mp4|webm|video|lecture|screencast)/.test(type)) return "video"
  if (/(ppt|keynote|slide)/.test(type)) return "slides"
  if (/(xls|csv|sheet|data)/.test(type)) return "spreadsheet"
  if (/(zip|git|code|archive)/.test(type)) return "code"
  return "document"
}

export function sourceKindLabel(resource: Pick<Resource, "fileName" | "sourceUrl" | "format">) {
  if (resource.fileName) {
    const ext = extensionOf(resource.fileName)
    return ext ? ext.toUpperCase() : "File"
  }
  if (resource.sourceUrl) {
    if (youtubeVideoId(resource.sourceUrl)) return "YouTube"
    if (vimeoVideoId(resource.sourceUrl)) return "Vimeo"
    if (parseGitHubRepo(resource.sourceUrl)) return "GitHub"
    try {
      const ext = extensionOf(new URL(resource.sourceUrl).pathname)
      if (ext) return ext.toUpperCase()
    } catch {
      // keep generic link label
    }
    return "Link"
  }
  return formatBadge(resource.format)
}

export function displayType(kindLabel: string, resource: Pick<Resource, "format" | "fileName" | "sourceUrl">) {
  return `${kindLabel} · ${sourceKindLabel(resource)}`
}

export function uploadIssue(input: Pick<UploadInput, "format" | "file" | "sourceUrl">) {
  const link = (input.sourceUrl ?? "").trim()
  if (!input.file && !link) return "Attach a file or add a resource link."
  if (link && !isHttpUrl(link)) return "Enter a valid http or https link."

  if (input.file) {
    const ext = extensionOf(input.file.name)
    const allowed = FORMAT_EXTS[input.format]
    if (!allowed.includes(ext)) {
      return `${FORMAT_META[input.format].label} expects ${allowed.map((item) => item.toUpperCase()).join(", ")}.`
    }
  }

  if (!input.file && link) {
    if (input.format === "video") {
      const ok =
        Boolean(youtubeVideoId(link)) ||
        Boolean(vimeoVideoId(link)) ||
        isDirectMediaUrl(link, FORMAT_EXTS.video)
      if (!ok) return "Use a YouTube or Vimeo link, or upload an MP4 / WebM file."
    }
    if (input.format === "code") {
      const ok = Boolean(parseGitHubRepo(link)) || isDirectMediaUrl(link, FORMAT_EXTS.code)
      if (!ok) return "Use a GitHub repository link or upload a ZIP archive."
    }
    if (input.format === "slides" && inferFormatFromUrl(link) && inferFormatFromUrl(link) !== "slides") {
      return "That link does not look like a slide deck. Choose the matching format."
    }
  }

  return null
}

export function videoEmbedUrl(url: string) {
  const youtube = youtubeVideoId(url)
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube}`
  const vimeo = vimeoVideoId(url)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`
  return null
}

export function decodeDataUrlText(dataUrl: string) {
  const comma = dataUrl.indexOf(",")
  if (comma < 0) return ""
  const meta = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  try {
    const binary = meta.includes(";base64") ? atob(payload) : decodeURIComponent(payload)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder("utf-8").decode(bytes)
  } catch {
    return ""
  }
}

export function parseCsvPreview(text: string, maxRows = 48): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, "")

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      if (rows.length >= maxRows) break
    } else {
      cell += ch
    }
  }

  if (rows.length < maxRows && (cell.length > 0 || row.length > 0)) {
    row.push(cell)
    rows.push(row)
  }

  return rows.map((item) => item.slice(0, 12))
}

export function isPdfResource(resource: Pick<Resource, "fileName" | "mimeType" | "fileData">) {
  if (resource.mimeType === "application/pdf") return true
  if (extensionOf(resource.fileName ?? "") === "pdf") return true
  return Boolean(resource.fileData?.startsWith("data:application/pdf"))
}

export function isPptxResource(resource: Pick<Resource, "fileName" | "mimeType" | "fileData">) {
  if (extensionOf(resource.fileName ?? "") === "pptx") return true
  if (resource.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return true
  }
  return Boolean(
    resource.fileData?.startsWith("data:application/vnd.openxmlformats-officedocument.presentationml"),
  )
}

export function isDocxResource(resource: Pick<Resource, "fileName" | "mimeType" | "fileData">) {
  if (extensionOf(resource.fileName ?? "") === "docx") return true
  if (resource.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return true
  }
  return Boolean(
    resource.fileData?.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml"),
  )
}

export function isCsvResource(resource: Pick<Resource, "fileName" | "mimeType">) {
  if (resource.mimeType === "text/csv") return true
  return extensionOf(resource.fileName ?? "") === "csv"
}

export function isTextDocument(resource: Pick<Resource, "fileName" | "mimeType">) {
  if (resource.mimeType?.startsWith("text/")) return true
  return extensionOf(resource.fileName ?? "") === "txt"
}

export function isVideoFile(resource: Pick<Resource, "fileName" | "mimeType" | "fileData">) {
  if (resource.mimeType?.startsWith("video/")) return true
  if (["mp4", "webm"].includes(extensionOf(resource.fileName ?? ""))) return true
  return Boolean(resource.fileData?.startsWith("data:video/"))
}
