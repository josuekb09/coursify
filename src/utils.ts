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
  const tokens = needle.split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) {
    return true
  }
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

export function formatEventWhen(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function mapsEmbedUrl(address: string) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=14&output=embed`
}

export function mapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function isUpcomingEvent(iso: string) {
  return new Date(iso).getTime() >= Date.now() - 60 * 60 * 1000
}

export function deliverResource(resource: Resource, author: string) {
  if (resource.fileData && resource.fileName) {
    downloadDataUrl(resource.fileName, resource.fileData)
    return "download" as const
  }
  const isDirectUrl =
    Boolean(resource.fileUrl) &&
    (resource.fileUrl!.startsWith("http://") ||
      resource.fileUrl!.startsWith("https://") ||
      resource.fileUrl!.startsWith("blob:") ||
      resource.fileUrl!.startsWith("data:"))
  if (isDirectUrl && resource.fileUrl) {
    const anchor = document.createElement("a")
    anchor.href = resource.fileUrl
    anchor.download = resource.fileName ?? resource.title
    anchor.target = "_blank"
    anchor.rel = "noopener noreferrer"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    return "download" as const
  }
  if (resource.sourceUrl && (resource.sourceUrl.startsWith("http://") || resource.sourceUrl.startsWith("https://"))) {
    window.open(resource.sourceUrl, "_blank", "noopener,noreferrer")
    return "open" as const
  }
  if (resource.slides && resource.slides.length > 0) {
    const slideLines = [
      `# ${resource.title}`,
      `${resource.subject} · ${resource.grade}`,
      `Author: ${author}`,
      "",
      "---",
      "",
      ...resource.slides.flatMap((slide, idx) => [
        `## Slide ${idx + 1}: ${slide.title}`,
        slide.subtitle ? `_${slide.subtitle}_` : "",
        ...(slide.bullets?.map((b) => `• ${b}`) ?? []),
        "",
      ]),
    ].filter(Boolean)
    downloadTextFile(
      resourceFilename(resource.fileName ? resource.fileName.replace(/\.[^.]+$/, ".txt") : resource.title),
      slideLines.join("\n"),
    )
    return "download" as const
  }
  downloadTextFile(
    resourceFilename(resource.fileName ?? resource.title),
    [
      `# ${resource.title}`,
      `${resource.subject} · ${resource.grade}`,
      `By ${author}`,
      resource.fileName ? `File: ${resource.fileName} (${resource.fileSize ?? ""})` : "",
      "",
      "This resource is indexed in your Coursify library.",
    ]
      .filter(Boolean)
      .join("\n"),
  )
  return "download" as const
}

export function isEducatorOnline(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  return diff >= 0 && diff <= 2 * 60 * 1000 // Active in last 2 minutes
}

export function formatEducatorActivity(lastActiveAt?: string | null): { isOnline: boolean; label: string } {
  if (!lastActiveAt) return { isOnline: false, label: "Offline" }
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  if (diff >= 0 && diff <= 2 * 60 * 1000) {
    return { isOnline: true, label: "Active now" }
  }
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) {
    return { isOnline: false, label: `Active ${Math.max(1, minutes)}m ago` }
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return { isOnline: false, label: `Active ${hours}h ago` }
  }
  const days = Math.floor(hours / 24)
  if (days === 1) {
    return { isOnline: false, label: "Active yesterday" }
  }
  return { isOnline: false, label: `Active ${days}d ago` }
}

