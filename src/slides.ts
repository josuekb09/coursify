import { sanitizePlainText } from "@/security"
import type { Slide } from "@/types"

export function sanitizeSlide(raw: Partial<Slide> | null | undefined): Slide | null {
  if (!raw) return null
  const title = sanitizePlainText(String(raw.title ?? ""), 160)
  const subtitle = sanitizePlainText(String(raw.subtitle ?? ""), 180)
  const bullets = (Array.isArray(raw.bullets) ? raw.bullets : String(raw.bullets ?? "").split("\n"))
    .map((item) => sanitizePlainText(String(item), 220))
    .filter(Boolean)
    .slice(0, 16)
  if (!title && bullets.length === 0) return null
  return { title: title || bullets[0] || "", subtitle, bullets: title ? bullets : bullets.slice(1) }
}

export function sanitizeDeck(raw: unknown): Slide[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => sanitizeSlide(item as Partial<Slide>))
    .filter((item): item is Slide => item !== null)
    .slice(0, 40)
}
