import type { Educator, ProfileTab, Resource, ResourceKind } from "@/types"

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename: string, content: string) {
  downloadBlob(filename, new Blob([content], { type: "text/plain;charset=utf-8" }))
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const anchor = document.createElement("a")
  anchor.href = dataUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function resourceFilename(title: string) {
  return `${title.replace(/[^\w]+/g, "_")}.txt`
}

export function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function formatCount(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`
  }
  return value.toLocaleString()
}

export function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 KB"
  const gb = bytes / 1_000_000_000
  if (gb >= 0.1) return `${gb.toFixed(1)} GB`
  const mb = bytes / 1_000_000
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.max(bytes / 1000, 0.1).toFixed(1)} KB`
}

export function kindToTab(kind: ResourceKind): ProfileTab {
  if (kind === "lesson-plan") return "Lesson Plans"
  if (kind === "collection") return "Collections"
  return "Resources"
}

export function kindLabel(kind: ResourceKind) {
  if (kind === "lesson-plan") return "Lesson plan"
  if (kind === "collection") return "Collection"
  return "Resource"
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

function foldSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

export function educatorMatchesQuery(educator: Educator, query: string) {
  const needle = foldSearchText(query.trim())
  if (!needle) return true
  const haystack = foldSearchText(
    [educator.name, educator.school, educator.subject, educator.email, educator.bio].join(" "),
  )
  if (haystack.includes(needle)) return true
  return educator.name
    .split(/\s+/)
    .some((part) => foldSearchText(part).includes(needle))
}

export function searchEducators(pool: Educator[], query: string) {
  return pool.filter((educator) => educatorMatchesQuery(educator, query))
}

export function rankEducatorSearchResults(pool: Educator[], query: string, viewerId?: string) {
  const matches = searchEducators(pool, query)
  return matches.sort((a, b) => {
    if (viewerId) {
      if (a.id === viewerId) return -1
      if (b.id === viewerId) return 1
    }
    return a.name.localeCompare(b.name)
  })
}

export function followButtonLabel(following: boolean, followsYou: boolean) {
  if (following) return "Following"
  if (followsYou) return "Follow back"
  return "Follow"
}

export function filterResources(pool: Resource[], query: string, subject: string) {
  const needle = query.trim().toLowerCase()
  return pool.filter((resource) => {
    const matchSubject = subject === "All" || resource.subject === subject
    if (!needle) return matchSubject
    const haystack = [
      resource.title,
      resource.subject,
      resource.grade,
      resource.type,
      resource.format,
      resource.fileName ?? "",
    ]
      .join(" ")
      .toLowerCase()
    return matchSubject && haystack.includes(needle)
  })
}

export function buildCvText(educator: Educator) {
  return [
    educator.name.toUpperCase(),
    educator.subject,
    educator.school,
    educator.email,
    "",
    "BIO & CREDENTIALS",
    educator.bio,
  ].join("\n")
}

export function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read that file."))
    reader.readAsDataURL(file)
  })
}

export function formatWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const now = Date.now()
  const diff = now - date.getTime()
  if (diff < 60_000) return "Just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function conversationIdFor(a: string, b: string) {
  return [a, b].sort().join(":")
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function deliverResource(resource: Resource, author: string) {
  if (resource.fileData && resource.fileName) {
    downloadDataUrl(resource.fileName, resource.fileData)
    return "download" as const
  }
  if (resource.sourceUrl) {
    window.open(resource.sourceUrl, "_blank", "noopener,noreferrer")
    return "open" as const
  }
  downloadTextFile(
    resourceFilename(resource.title),
    [resource.title, `${resource.subject}  ·  ${resource.grade}`, `By ${author}`].join("\n"),
  )
  return "download" as const
}
