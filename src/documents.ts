import { extensionOf } from "@/formats"
import { sanitizePlainText } from "@/security"
import type { Resource } from "@/types"

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
}

const CHILD_TAGS = ["p:sp", "p:grpSp", "p:pic", "p:cxnSp", "p:graphicFrame"]
const decoder = new TextDecoder("utf-8")

export type PptxParagraph = {
  text: string
  align: "left" | "center" | "right"
  sizePt: number
  bold: boolean
  italic: boolean
  color: string
  font?: string
}

export type PptxNode = {
  x: number
  y: number
  w: number
  h: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  ellipse?: boolean
  radius?: string
  imageData?: string
  paragraphs?: PptxParagraph[]
  line?: { x1: number; y1: number; x2: number; y2: number }
  anchor?: "flex-start" | "center" | "flex-end"
  pad?: string
}

export type PptxSlide = {
  background: string
  cx: number
  cy: number
  nodes: PptxNode[]
}

type Theme = Record<string, string>
type Rels = Map<string, { type: string; target: string }>
type Box = { x: number; y: number; w: number; h: number; flipH: boolean; flipV: boolean }
type GroupXf = { off: Box; ch: Box }

export function dataUrlMime(dataUrl: string) {
  const match = /^data:([^;,]+)/i.exec(dataUrl)
  return match?.[1] || "application/octet-stream"
}

export function dataUrlToBytes(dataUrl: string) {
  const comma = dataUrl.indexOf(",")
  if (comma < 0) throw new Error("invalid data url")
  const meta = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  if (meta.includes(";base64")) {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  return new TextEncoder().encode(decodeURIComponent(payload))
}

export function dataUrlToBlob(dataUrl: string) {
  const bytes = dataUrlToBytes(dataUrl)
  return new Blob([toArrayBuffer(bytes)], { type: dataUrlMime(dataUrl) })
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string) {
  const chunk = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

export function isZipBytes(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

export async function unzip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = findEocd(view, bytes.length)
  const count = u16(view, eocd + 10)
  let offset = u32(view, eocd + 16)
  const files = new Map<string, Uint8Array>()

  for (let i = 0; i < count; i += 1) {
    if (u32(view, offset) !== 0x02014b50) throw new Error("invalid zip directory")
    const method = u16(view, offset + 10)
    const compressedSize = u32(view, offset + 20)
    const nameLen = u16(view, offset + 28)
    const extraLen = u16(view, offset + 30)
    const commentLen = u16(view, offset + 32)
    const localOff = u32(view, offset + 42)
    const name = readName(bytes, offset + 46, nameLen)
    const next = offset + 46 + nameLen + extraLen + commentLen

    if (name.endsWith("/")) {
      offset = next
      continue
    }

    if (u32(view, localOff) !== 0x04034b50) throw new Error("invalid zip entry")
    const localNameLen = u16(view, localOff + 26)
    const localExtraLen = u16(view, localOff + 28)
    const dataStart = localOff + 30 + localNameLen + localExtraLen
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize)
    files.set(normalizeZipPath(name), await inflate(compressed, method))
    offset = next
  }

  return files
}

export async function parsePptx(bytes: Uint8Array): Promise<PptxSlide[]> {
  if (!isZipBytes(bytes)) throw new Error("not a pptx file")
  const zip = await unzip(bytes)
  const presXml = decoder.decode(zip.get("ppt/presentation.xml") ?? new Uint8Array())
  const size = slideSize(presXml)
  const theme = loadTheme(zip)
  const slides: PptxSlide[] = []

  for (const path of slideOrder(zip).slice(0, 40)) {
    const xmlBytes = zip.get(path)
    if (!xmlBytes) continue
    const relsPath = relsFor(path)
    const rels = parseRels(zip.get(relsPath) ? decoder.decode(zip.get(relsPath)) : "")
    const fromDir = path.slice(0, path.lastIndexOf("/"))
    const layoutPath = relatedPath(rels, fromDir, "slideLayout")
    const layoutXml = layoutPath && zip.get(layoutPath) ? decoder.decode(zip.get(layoutPath)) : ""
    const layoutRels = layoutPath ? parseRels(zip.get(relsFor(layoutPath)) ? decoder.decode(zip.get(relsFor(layoutPath))) : "") : new Map()
    const masterPath = relatedPath(layoutRels, layoutPath ? layoutPath.slice(0, layoutPath.lastIndexOf("/")) : "ppt/slideLayouts", "slideMaster")
    const masterXml = masterPath && zip.get(masterPath) ? decoder.decode(zip.get(masterPath)) : ""
    const layoutBoxes = layoutPath ? placeholderBoxes(layoutXml) : new Map<string, Box>()
    const xml = stripFallback(decoder.decode(xmlBytes))
    const background =
      backgroundColor(xml, theme) ||
      backgroundColor(layoutXml, theme) ||
      backgroundColor(masterXml, theme) ||
      "#ffffff"
    const nodes: PptxNode[] = []
    parseTree(spTreeInner(xml), zip, rels, fromDir, theme, size, null, layoutBoxes, nodes)
    supplementTextNodes(xml, theme, size, layoutBoxes, nodes)
    supplementOrphanTextBodies(xml, theme, size, nodes)
    if (!nodes.some((node) => node.paragraphs?.some((paragraph) => paragraph.text.trim()))) {
      nodes.push(...textFallbackNodes(xml, theme, size))
    }
    if (!nodes.some((node) => node.paragraphs?.some((paragraph) => paragraph.text.trim())) && layoutXml) {
      supplementTextNodes(layoutXml, theme, size, layoutBoxes, nodes)
      supplementOrphanTextBodies(layoutXml, theme, size, nodes)
    }
    if (layoutXml && nodes.every((node) => !node.fill && !node.imageData)) {
      parseTree(spTreeInner(layoutXml), zip, layoutRels, layoutPath ? layoutPath.slice(0, layoutPath.lastIndexOf("/")) : "ppt/slideLayouts", theme, size, null, layoutBoxes, nodes, true)
    }
    slides.push({ background, cx: size.cx, cy: size.cy, nodes })
  }

  return slides
}

export async function parsePptxFromDataUrl(dataUrl: string) {
  return parsePptx(dataUrlToBytes(dataUrl))
}

export async function parseDocx(bytes: Uint8Array) {
  if (!isZipBytes(bytes)) throw new Error("not a docx file")
  const zip = await unzip(bytes)
  const xmlBytes = zip.get("word/document.xml")
  if (!xmlBytes) throw new Error("missing document.xml")
  return parseDocxXml(decoder.decode(xmlBytes))
}

export async function parseDocxFromDataUrl(dataUrl: string) {
  return parseDocx(dataUrlToBytes(dataUrl))
}

export function slidesFromFile(resource: Pick<Resource, "fileName" | "mimeType" | "fileData">) {
  const ext = extensionOf(resource.fileName ?? "")
  const mime = resource.mimeType ?? ""
  return (
    ext === "pptx" ||
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    Boolean(resource.fileData?.startsWith("data:application/vnd.openxmlformats-officedocument.presentationml"))
  )
}

export function isDocxFile(resource: Pick<Resource, "fileName" | "mimeType" | "fileData">) {
  const ext = extensionOf(resource.fileName ?? "")
  const mime = resource.mimeType ?? ""
  return (
    ext === "docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    Boolean(resource.fileData?.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml"))
  )
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true)
}

function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true)
}

function findEocd(view: DataView, length: number) {
  const min = Math.max(0, length - 22 - 65535)
  for (let i = length - 22; i >= min; i -= 1) {
    if (u32(view, i) === 0x06054b50) return i
  }
  throw new Error("not a zip archive")
}

function readName(bytes: Uint8Array, offset: number, length: number) {
  return decoder.decode(bytes.subarray(offset, offset + length))
}

function normalizeZipPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "")
}

async function inflate(data: Uint8Array, method: number) {
  if (method === 0) return data
  if (method !== 8) throw new Error("unsupported zip compression")
  const stream = new Blob([toArrayBuffer(data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function attr(tag: string, name: string) {
  const match = new RegExp(`${name}="([^"]*)"`, "i").exec(tag)
  return match?.[1] ?? ""
}

function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function parseRels(xml: string) {
  const rels: Rels = new Map()
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const tag = match[1]
    const id = attr(tag, "Id")
    const type = attr(tag, "Type")
    const target = attr(tag, "Target")
    if (id && target) rels.set(id, { type, target })
  }
  return rels
}

function resolveZipPath(fromDir: string, target: string) {
  const normalized = normalizeZipPath(target)
  if (target.startsWith("/")) return normalized
  const parts = fromDir.split("/").filter(Boolean)
  for (const segment of normalized.split("/")) {
    if (!segment || segment === ".") continue
    if (segment === "..") parts.pop()
    else parts.push(segment)
  }
  return parts.join("/")
}

function relsFor(path: string) {
  const slash = path.lastIndexOf("/")
  const dir = path.slice(0, slash)
  const file = path.slice(slash + 1)
  return `${dir}/_rels/${file}.rels`
}

function relatedPath(rels: Rels, fromDir: string, kind: string) {
  for (const rel of rels.values()) {
    if (rel.type.endsWith(`/${kind}`)) return resolveZipPath(fromDir, rel.target)
  }
  return ""
}

function slideOrder(zip: Map<string, Uint8Array>) {
  const pres = zip.get("ppt/presentation.xml")
  const rels = zip.get("ppt/_rels/presentation.xml.rels")
  if (pres && rels) {
    const relMap = parseRels(decoder.decode(rels))
    const ordered = [...decoder.decode(pres).matchAll(/<p:sldId\b([^>]*)\/?>/g)]
      .map((match) => {
        const rid = attr(match[1], "r:id") || attr(match[1], "rid")
        const rel = rid ? relMap.get(rid) : undefined
        if (!rel || !rel.type.endsWith("/slide")) return null
        return resolveZipPath("ppt", rel.target)
      })
      .filter((item): item is string => Boolean(item))
    if (ordered.length > 0) return ordered
  }

  return [...zip.keys()]
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0))
}

function slideSize(presXml: string) {
  const tag = /<p:sldSz\b([^>]*)\/?>/.exec(presXml)?.[1] ?? ""
  const cx = Number(attr(tag, "cx")) || 12192000
  const cy = Number(attr(tag, "cy")) || 6858000
  return { cx, cy }
}

function stripFallback(xml: string) {
  return xml.replace(/<mc:Fallback\b[\s\S]*?<\/mc:Fallback>/g, "")
}

function afterGrpSpPr(xml: string) {
  const close = xml.indexOf("</p:grpSpPr>")
  if (close >= 0) return xml.slice(close + "</p:grpSpPr>".length)
  const self = /<p:grpSpPr\b[^>]*\/>/.exec(xml)
  if (self && self.index !== undefined) return xml.slice(self.index + self[0].length)
  return xml
}

function spTreeInner(xml: string) {
  const tree = /<p:spTree\b[\s\S]*<\/p:spTree>/.exec(xml)?.[0] ?? xml
  return afterGrpSpPr(tree).replace(/<\/p:spTree>\s*$/, "")
}

function sanitizeSlideText(value: string, max = 400) {
  return value
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max)
}

function isTagEnd(xml: string, afterName: number) {
  const ch = xml[afterName]
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === ">" || ch === "/"
}

function findOpen(xml: string, name: string, from: number) {
  const token = `<${name}`
  let pos = from
  while (pos < xml.length) {
    const index = xml.indexOf(token, pos)
    if (index < 0) return -1
    if (isTagEnd(xml, index + token.length)) return index
    pos = index + token.length
  }
  return -1
}

function extractBlocks(xml: string, names: string[]) {
  const blocks: { name: string; xml: string }[] = []
  let i = 0
  while (i < xml.length) {
    let next = -1
    let name = ""
    for (const item of names) {
      const index = findOpen(xml, item, i)
      if (index >= 0 && (next < 0 || index < next)) {
        next = index
        name = item
      }
    }
    if (next < 0 || !name) break
    const gt = xml.indexOf(">", next)
    if (gt < 0) break
    if (xml[gt - 1] === "/") {
      blocks.push({ name, xml: xml.slice(next, gt + 1) })
      i = gt + 1
      continue
    }
    const close = `</${name}>`
    let depth = 1
    let pos = gt + 1
    while (depth > 0 && pos < xml.length) {
      const openAt = findOpen(xml, name, pos)
      const closeAt = xml.indexOf(close, pos)
      if (closeAt < 0) {
        pos = xml.length
        break
      }
      if (openAt >= 0 && openAt < closeAt) {
        depth += 1
        pos = xml.indexOf(">", openAt) + 1
      } else {
        depth -= 1
        pos = closeAt + close.length
      }
    }
    blocks.push({ name, xml: xml.slice(next, pos) })
    i = pos
  }
  return blocks
}

function num(tag: string, name: string, fallback = 0) {
  const value = Number(attr(tag, name))
  return Number.isFinite(value) ? value : fallback
}

function parseXfrm(xml: string): Box | null {
  const block = /<a:xfrm\b[\s\S]*?<\/a:xfrm>/.exec(xml)?.[0] ?? /<a:xfrm\b([^>]*)\/>/.exec(xml)?.[0]
  if (!block) return null
  const head = /<a:xfrm\b([^>]*)/.exec(block)?.[1] ?? ""
  const off = /<a:off\b([^>]*)\/?>/.exec(block)?.[1] ?? ""
  const ext = /<a:ext\b([^>]*)\/?>/.exec(block)?.[1] ?? ""
  return {
    x: num(off, "x"),
    y: num(off, "y"),
    w: num(ext, "cx"),
    h: num(ext, "cy"),
    flipH: attr(head, "flipH") === "1",
    flipV: attr(head, "flipV") === "1",
  }
}

function parseChXfrm(xml: string): Box | null {
  const block = /<a:xfrm\b[\s\S]*?<\/a:xfrm>/.exec(xml)?.[0]
  if (!block) return null
  const off = /<a:chOff\b([^>]*)\/?>/.exec(block)?.[1] ?? /<a:off\b([^>]*)\/?>/.exec(block)?.[1] ?? ""
  const ext = /<a:chExt\b([^>]*)\/?>/.exec(block)?.[1] ?? /<a:ext\b([^>]*)\/?>/.exec(block)?.[1] ?? ""
  const head = /<a:xfrm\b([^>]*)/.exec(block)?.[1] ?? ""
  return {
    x: num(off, "x"),
    y: num(off, "y"),
    w: num(ext, "cx"),
    h: num(ext, "cy"),
    flipH: attr(head, "flipH") === "1",
    flipV: attr(head, "flipV") === "1",
  }
}

function applyGroup(group: GroupXf | null, box: Box): Box {
  if (!group) return box
  const sx = group.off.w / (group.ch.w || 1)
  const sy = group.off.h / (group.ch.h || 1)
  return {
    x: group.off.x + (box.x - group.ch.x) * sx,
    y: group.off.y + (box.y - group.ch.y) * sy,
    w: box.w * sx,
    h: box.h * sy,
    flipH: box.flipH,
    flipV: box.flipV,
  }
}

function pct(value: number, total: number) {
  if (!total) return 0
  return (value / total) * 100
}

function hexColor(value: string) {
  const hex = value.replace("#", "").trim()
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return ""
  return `#${hex}`
}

function colorFrom(xml: string, theme: Theme) {
  const srgb = /<a:srgbClr\b[^>]*val="([^"]+)"/.exec(xml)
  if (srgb) return hexColor(srgb[1])
  const sys = /<a:sysClr\b[^>]*lastClr="([^"]+)"/.exec(xml)
  if (sys) return hexColor(sys[1])
  const scheme = /<a:schemeClr\b[^>]*val="([^"]+)"/.exec(xml)
  if (scheme) return theme[scheme[1].toLowerCase()] || ""
  return ""
}

function solidFill(xml: string, theme: Theme) {
  const fill = /<a:solidFill\b[\s\S]*?<\/a:solidFill>/.exec(xml)?.[0]
  if (!fill) return ""
  return colorFrom(fill, theme)
}

function gradientFill(xml: string, theme: Theme) {
  const fill = /<a:gradFill\b[\s\S]*?<\/a:gradFill>/.exec(xml)?.[0]
  if (!fill) return ""
  const stops = [...fill.matchAll(/<a:gs\b[\s\S]*?<\/a:gs>/g)]
    .map((match) => colorFrom(match[0], theme))
    .filter(Boolean)
  if (stops.length === 0) return ""
  if (stops.length === 1) return stops[0]
  return `linear-gradient(160deg, ${stops[0]} 0%, ${stops[stops.length - 1]} 100%)`
}

function backgroundColor(xml: string, theme: Theme) {
  const bg = /<p:bg\b[\s\S]*?<\/p:bg>/.exec(xml)?.[0] ?? ""
  if (!bg) return ""
  return solidFill(bg, theme) || gradientFill(bg, theme)
}

function loadTheme(zip: Map<string, Uint8Array>): Theme {
  const path = [...zip.keys()].find((name) => /^ppt\/theme\/theme\d+\.xml$/i.test(name))
  const xml = path && zip.get(path) ? decoder.decode(zip.get(path)) : ""
  const theme: Theme = {}
  const names = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]
  for (const name of names) {
    const block = new RegExp(`<a:${name}\\b[\\s\\S]*?</a:${name}>`).exec(xml)?.[0]
    if (!block) continue
    const color = colorFrom(block, {})
    if (color) theme[name] = color
  }
  if (theme.dk1) theme.tx1 = theme.dk1
  if (theme.dk2) theme.tx2 = theme.dk2
  if (theme.lt1) theme.bg1 = theme.lt1
  if (theme.lt2) theme.bg2 = theme.lt2
  return theme
}

function placeholderType(shapeXml: string) {
  const ph = /<p:ph\b([^>]*)\/?>/.exec(shapeXml)
  if (!ph) return ""
  return attr(ph[1], "type") || "title"
}

function placeholderBoxes(layoutXml: string) {
  const boxes = new Map<string, Box>()
  if (!layoutXml) return boxes
  for (const block of extractBlocks(spTreeInner(layoutXml), CHILD_TAGS)) {
    if (block.name !== "p:sp" && block.name !== "p:pic") continue
    const kind = placeholderType(block.xml)
    const xf = parseXfrm(block.xml)
    if (kind && xf) boxes.set(kind, xf)
  }
  return boxes
}

function defaultBox(kind: string, index: number, size: { cx: number; cy: number }): Box {
  const presets: Record<string, Box> = {
    ctrTitle: { x: size.cx * 0.08, y: size.cy * 0.18, w: size.cx * 0.84, h: size.cy * 0.22, flipH: false, flipV: false },
    title: { x: size.cx * 0.08, y: size.cy * 0.08, w: size.cx * 0.84, h: size.cy * 0.16, flipH: false, flipV: false },
    subTitle: { x: size.cx * 0.1, y: size.cy * 0.34, w: size.cx * 0.8, h: size.cy * 0.1, flipH: false, flipV: false },
    body: { x: size.cx * 0.08, y: size.cy * 0.42, w: size.cx * 0.84, h: size.cy * 0.48, flipH: false, flipV: false },
  }
  if (presets[kind]) return presets[kind]
  const row = Math.min(index, 5)
  return {
    x: size.cx * 0.08,
    y: size.cy * (0.12 + row * 0.14),
    w: size.cx * 0.84,
    h: size.cy * 0.12,
    flipH: false,
    flipV: false,
  }
}

function textFallbackNodes(xml: string, theme: Theme, size: { cx: number; cy: number }) {
  const nodes: PptxNode[] = []
  let index = 0
  walkShapeBlocks(xml, (shapeXml) => {
    if (skipPlaceholder(shapeXml)) return
    const paragraphs = parseParagraphs(shapeXml, theme)
    if (paragraphs.length === 0) return
    const kind = placeholderType(shapeXml)
    const xf = parseXfrm(shapeXml) ?? defaultBox(kind, index, size)
    index += 1
    nodes.push({
      ...toPercent(xf, size),
      paragraphs,
      anchor: kind === "ctrTitle" || kind === "title" || kind === "subTitle" ? "center" : "flex-start",
      pad: "3% 5%",
    })
  })
  return nodes
}

function walkShapeBlocks(xml: string, visit: (shapeXml: string) => void) {
  for (const block of extractBlocks(xml, ["p:sp", "p:grpSp"])) {
    if (block.name === "p:grpSp") {
      walkShapeBlocks(afterGrpSpPr(block.xml).replace(/<\/p:grpSp>\s*$/, ""), visit)
      continue
    }
    visit(block.xml)
  }
}

function supplementTextNodes(
  xml: string,
  theme: Theme,
  size: { cx: number; cy: number },
  layoutBoxes: Map<string, Box>,
  nodes: PptxNode[],
) {
  const seen = new Set(
    nodes.flatMap((node) => node.paragraphs?.map((paragraph) => paragraph.text.trim().toLowerCase()) ?? []),
  )
  let index = 0
  walkShapeBlocks(xml, (shapeXml) => {
    if (skipPlaceholder(shapeXml)) return
    const paragraphs = parseParagraphs(shapeXml, theme)
    if (paragraphs.length === 0) return
    const signature = paragraphs.map((paragraph) => paragraph.text.trim().toLowerCase()).join("|")
    if (seen.has(signature) || paragraphs.every((paragraph) => seen.has(paragraph.text.trim().toLowerCase()))) {
      return
    }
    seen.add(signature)
    for (const paragraph of paragraphs) seen.add(paragraph.text.trim().toLowerCase())
    const kind = placeholderType(shapeXml)
    const xf = parseXfrm(shapeXml) ?? layoutBoxes.get(kind) ?? defaultBox(kind, index, size)
    index += 1
    nodes.push({
      ...toPercent(xf, size),
      paragraphs,
      anchor: kind === "ctrTitle" || kind === "title" || kind === "subTitle" ? "center" : "flex-start",
      pad: "3% 5%",
    })
  })
}

function supplementOrphanTextBodies(
  xml: string,
  theme: Theme,
  size: { cx: number; cy: number },
  nodes: PptxNode[],
) {
  const seen = new Set(
    nodes.flatMap((node) => node.paragraphs?.map((paragraph) => paragraph.text.trim().toLowerCase()) ?? []),
  )
  let index = 0
  for (const match of xml.matchAll(/<p:txBody\b[\s\S]*?<\/p:txBody>/g)) {
    const paragraphs = parseParagraphs(`<p:sp>${match[0]}</p:sp>`, theme)
    if (paragraphs.length === 0) continue
    const signature = paragraphs.map((paragraph) => paragraph.text.trim().toLowerCase()).join("|")
    if (paragraphs.every((paragraph) => seen.has(paragraph.text.trim().toLowerCase()))) continue
    seen.add(signature)
    for (const paragraph of paragraphs) seen.add(paragraph.text.trim().toLowerCase())
    const box = defaultBox(index === 0 ? "title" : "body", index, size)
    const isTitle = index === 0
    index += 1
    nodes.push({
      ...toPercent(box, size),
      paragraphs,
      anchor: isTitle ? "center" : "flex-start",
      pad: "3% 5%",
    })
  }
}

export function slidePlainText(slide: PptxSlide) {
  return slide.nodes
    .flatMap((node) => node.paragraphs?.map((paragraph) => paragraph.text.trim()) ?? [])
    .filter(Boolean)
    .join("\n")
}

function skipPlaceholder(xml: string) {
  const ph = /<p:ph\b([^>]*)\/?>/.exec(xml)?.[1] ?? ""
  const type = attr(ph, "type")
  return type === "dt" || type === "ftr" || type === "sldNum" || type === "hdr"
}

function parseTree(
  xml: string,
  zip: Map<string, Uint8Array>,
  rels: Rels,
  fromDir: string,
  theme: Theme,
  size: { cx: number; cy: number },
  group: GroupXf | null,
  layoutBoxes: Map<string, Box>,
  nodes: PptxNode[],
  layoutOnly = false,
) {
  let shapeIndex = 0
  for (const block of extractBlocks(xml, CHILD_TAGS)) {
    if (block.name === "p:grpSp") {
      const xf = parseXfrm(block.xml)
      const ch = parseChXfrm(block.xml)
      if (!xf || !ch) continue
      const mapped: GroupXf = { off: applyGroup(group, xf), ch }
      const inner = afterGrpSpPr(block.xml).replace(/<\/p:grpSp>\s*$/, "")
      parseTree(inner, zip, rels, fromDir, theme, size, mapped, layoutBoxes, nodes, layoutOnly)
      continue
    }

    if (skipPlaceholder(block.xml)) continue
    const kind = placeholderType(block.xml)
    const xf = parseXfrm(block.xml) ?? layoutBoxes.get(kind) ?? defaultBox(kind, shapeIndex, size)
    shapeIndex += 1
    const box = applyGroup(group, xf)
    const node = toPercent(box, size)
    const paragraphs = layoutOnly ? [] : parseParagraphs(block.xml, theme)

    if (block.name === "p:cxnSp") {
      const x1 = box.flipH ? box.x + box.w : box.x
      const y1 = box.flipV ? box.y + box.h : box.y
      const x2 = box.flipH ? box.x : box.x + box.w
      const y2 = box.flipV ? box.y : box.y + box.h
      nodes.push({
        ...node,
        stroke: lineColor(block.xml, theme) || "#94a3b8",
        strokeWidth: lineWidth(block.xml, size.cy),
        line: {
          x1: pct(x1, size.cx),
          y1: pct(y1, size.cy),
          x2: pct(x2, size.cx),
          y2: pct(y2, size.cy),
        },
      })
      continue
    }

    if (block.name === "p:pic") {
      const imageData = imageFrom(block.xml, zip, rels, fromDir)
      if (imageData) nodes.push({ ...node, imageData })
      continue
    }

    if (block.name === "p:graphicFrame") {
      const imageData = imageFrom(block.xml, zip, rels, fromDir)
      if (imageData) nodes.push({ ...node, imageData })
      const tableText = parseTableParagraphs(block.xml, theme)
      if (tableText.length > 0) {
        nodes.push({
          ...node,
          paragraphs: tableText,
          anchor: "flex-start",
          pad: "3% 5%",
        })
      }
      continue
    }

    const geom = /<a:prstGeom\b[^>]*prst="([^"]+)"/.exec(block.xml)?.[1] ?? ""
    const fill = solidFill(block.xml, theme) || gradientFill(block.xml, theme)
    const imageData = imageFrom(block.xml, zip, rels, fromDir)
    const hasGeom = geom && geom !== "none" && (fill || geom === "ellipse" || geom === "roundRect" || geom === "rect")
    const isBackgroundRect =
      layoutOnly &&
      hasGeom &&
      fill &&
      node.w >= 98 &&
      node.h >= 98 &&
      node.x <= 1 &&
      node.y <= 1

    if (hasGeom || fill) {
      if (!layoutOnly || isBackgroundRect || !nodes.some((item) => item.fill && item.w >= 98)) {
        nodes.push({
          ...node,
          fill: fill || undefined,
          ellipse: geom === "ellipse" || geom === "circle",
          radius: geom === "roundRect" || geom === "round1Rect" ? "12%" : undefined,
          stroke: lineColor(block.xml, theme) || undefined,
          strokeWidth: lineWidth(block.xml, size.cy),
        })
      }
    }
    if (imageData) nodes.push({ ...node, imageData })
    if (paragraphs.length > 0) {
      const bodyPr = /<a:bodyPr\b([^>]*)/.exec(block.xml)?.[1] ?? ""
      const anchorAttr = attr(bodyPr, "anchor")
      nodes.push({
        ...node,
        paragraphs,
        anchor: anchorAttr === "ctr" ? "center" : anchorAttr === "b" ? "flex-end" : "flex-start",
        pad: shapePad(bodyPr, box),
      })
    }
  }
}

function toPercent(box: Box, size: { cx: number; cy: number }): PptxNode {
  return {
    x: pct(box.x, size.cx),
    y: pct(box.y, size.cy),
    w: pct(box.w, size.cx),
    h: pct(box.h, size.cy),
  }
}

function lineColor(xml: string, theme: Theme) {
  const ln = /<a:ln\b[\s\S]*?<\/a:ln>/.exec(xml)?.[0] ?? ""
  return solidFill(ln, theme)
}

function lineWidth(xml: string, slideCy: number) {
  const ln = /<a:ln\b([^>]*)/.exec(xml)?.[1] ?? ""
  const emu = Number(attr(ln, "w"))
  if (!emu || !slideCy) return 1
  return Math.max(0.5, (emu / slideCy) * 400)
}

function imageFrom(xml: string, zip: Map<string, Uint8Array>, rels: Rels, fromDir: string) {
  for (const match of xml.matchAll(/<(?:a:blip|asvg:svgBlip)\b[^>]*>/g)) {
    const rid = attr(match[0], "r:embed") || attr(match[0], "r:link")
    if (!rid) continue
    const rel = rels.get(rid)
    if (!rel) continue
    const path = resolveZipPath(fromDir, rel.target)
    const bytes = zip.get(path)
    if (!bytes) continue
    const ext = extensionOf(path)
    const mime = IMAGE_MIME[ext]
    if (!mime) continue
    return bytesToDataUrl(bytes, mime)
  }
  return undefined
}

function shapePad(bodyPr: string, box: Box) {
  const inset = (name: string) => {
    const raw = Number(attr(bodyPr, name))
    const emu = Number.isFinite(raw) && raw > 0 ? raw : 91440
    const span = name === "lIns" || name === "rIns" ? box.w : box.h
    if (!span) return "4%"
    return `${Math.min(18, (emu / span) * 100)}%`
  }
  return `${inset("tIns")} ${inset("rIns")} ${inset("bIns")} ${inset("lIns")}`
}

function parseParagraphs(shapeXml: string, theme: Theme): PptxParagraph[] {
  const body = /<p:txBody\b[\s\S]*?<\/p:txBody>/.exec(shapeXml)?.[0]
  if (!body) return []
  const defPr = /<a:defRPr\b([^>]*)/.exec(body)?.[1] ?? ""
  const defBlock = /<a:defRPr\b[\s\S]*?<\/a:defRPr>/.exec(body)?.[0] ?? ""
  const defSize = Number(attr(defPr, "sz"))
  const defAlign = attr(/<a:lvl1pPr\b([^>]*)/.exec(body)?.[1] ?? "", "algn")
  const paragraphs: PptxParagraph[] = []

  for (const match of body.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)) {
    const pXml = match[0]
    const pPr = /<a:pPr\b([^>]*)/.exec(pXml)?.[1] ?? ""
    const algn = attr(pPr, "algn") || defAlign
    const align = algn === "ctr" ? "center" : algn === "r" ? "right" : "left"
    let text = ""
    let sizePt = defSize > 0 ? defSize / 100 : 18
    let bold = attr(defPr, "b") === "1"
    let italic = attr(defPr, "i") === "1"
    let color = colorFrom(defBlock, theme) || "#12141c"
    let font = /<a:latin\b[^>]*typeface="([^"]+)"/.exec(defBlock)?.[1]
    let styled = false

    for (const token of pXml.matchAll(/<a:br\b[^>]*\/?>|<a:r\b[\s\S]*?<\/a:r>|<a:fld\b[\s\S]*?<\/a:fld>/g)) {
      const chunk = token[0]
      if (chunk.startsWith("<a:br")) {
        text += "\n"
        continue
      }
      const rPr = /<a:rPr\b([^>]*)/.exec(chunk)?.[1] ?? ""
      const rPrBlock = /<a:rPr\b[\s\S]*?<\/a:rPr>/.exec(chunk)?.[0] ?? ""
      const runText = [...chunk.matchAll(/<a:t\b[^>]*>([^<]*)<\/a:t>/g)].map((item) => decodeXml(item[1])).join("")
      if (!styled && rPr) {
        const size = Number(attr(rPr, "sz"))
        if (size > 0) sizePt = size / 100
        if (attr(rPr, "b")) bold = attr(rPr, "b") === "1"
        if (attr(rPr, "i")) italic = attr(rPr, "i") === "1"
        color = colorFrom(rPrBlock, theme) || color
        font = /<a:latin\b[^>]*typeface="([^"]+)"/.exec(chunk)?.[1] || font
        styled = true
      }
      text += runText
    }

    let clean = sanitizeSlideText(text)
    if (!clean) {
      clean = sanitizeSlideText(
        [...pXml.matchAll(/<a:t\b[^>]*>([^<]*)<\/a:t>/g)].map((item) => decodeXml(item[1])).join(""),
      )
    }
    if (!clean) continue
    paragraphs.push({
      text: clean,
      align,
      sizePt: Math.max(sizePt, 14),
      bold,
      italic,
      color: ensureReadableTextColor(color),
      font,
    })
  }

  if (paragraphs.length === 0) {
    const fallback = sanitizeSlideText(
      [...body.matchAll(/<a:t\b[^>]*>([^<]*)<\/a:t>/g)].map((item) => decodeXml(item[1])).join(" "),
    )
    if (fallback) {
      paragraphs.push({
        text: fallback,
        align: "left",
        sizePt: 18,
        bold: false,
        italic: false,
        color: "#12141c",
      })
    }
  }

  return paragraphs
}

function parseTableParagraphs(frameXml: string, theme: Theme): PptxParagraph[] {
  const paragraphs: PptxParagraph[] = []
  for (const cell of frameXml.matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)) {
    const wrapped = `<p:sp><p:txBody>${/<p:txBody\b[\s\S]*?<\/p:txBody>/.exec(cell[0])?.[0] ?? ""}</p:txBody></p:sp>`
    paragraphs.push(...parseParagraphs(wrapped, theme))
  }
  if (paragraphs.length > 0) return paragraphs
  const fallback = sanitizeSlideText(
    [...frameXml.matchAll(/<a:t\b[^>]*>([^<]*)<\/a:t>/g)].map((item) => decodeXml(item[1])).join(" "),
  )
  if (!fallback) return []
  return [
    {
      text: fallback,
      align: "left",
      sizePt: 16,
      bold: false,
      italic: false,
      color: "#12141c",
    },
  ]
}

function ensureReadableTextColor(color: string) {
  if (!color) return "#12141c"
  const hex = color.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return color
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (luminance > 0.82) return "#12141c"
  return color
}

function parseDocxXml(xml: string) {
  const blocks: string[] = []

  for (const match of xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
    const texts = [...match[0].matchAll(/<w:t\b[^>]*>([^<]*)<\/w:t>/g)].map((item) => decodeXml(item[1]))
    const line = sanitizePlainText(texts.join(""), 400)
    if (line) blocks.push(line)
  }

  for (const row of xml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)) {
    const cells = [...row[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)]
      .map((cell) =>
        sanitizePlainText(
          [...cell[0].matchAll(/<w:t\b[^>]*>([^<]*)<\/w:t>/g)].map((item) => decodeXml(item[1])).join(""),
          200,
        ),
      )
      .filter(Boolean)
    if (cells.length > 1) blocks.push(cells.join(" · "))
  }

  const unique = blocks.filter((item, index) => item && blocks.indexOf(item) === index)
  return unique.join("\n\n").slice(0, 20000)
}
