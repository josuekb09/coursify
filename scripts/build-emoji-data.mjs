// Builds src/emoji-data.json from emojibase-data: every standard emoji (Emoji 15.0 and older, so
// phones from the last few years can draw them), grouped like WhatsApp, with search words and
// skin-tone variants. Run with `node scripts/build-emoji-data.mjs` after upgrading emojibase-data.
import { createRequire } from "node:module"
import { writeFileSync } from "node:fs"

const require = createRequire(import.meta.url)
const data = require("emojibase-data/en/data.json")
const MAX_VERSION = 15

// emojibase group ids → our categories (component swatches are left out).
const GROUPS = {
  0: "smileys",
  1: "people",
  3: "nature",
  4: "food",
  5: "travel",
  6: "activities",
  7: "objects",
  8: "symbols",
  9: "flags",
}

const out = []
for (const item of data) {
  const category = GROUPS[item.group]
  if (!category || Number(item.version) > MAX_VERSION) continue
  const words = new Set([...item.label.toLowerCase().split(/[\s:,]+/), ...(item.tags ?? [])])
  words.delete("")
  const entry = { e: item.emoji, c: category, k: [...words].join(" ") }
  // One variant per skin tone, light → dark; mixed tones on multi-person emoji are left out.
  const skins = (item.skins ?? []).filter((skin) => {
    const tones = new Set(skin.hexcode.match(/1F3F[B-F]/g))
    return Number(skin.version) <= MAX_VERSION && tones.size === 1
  })
  if (skins.length >= 5) entry.s = skins.slice(0, 5).map((skin) => skin.emoji)
  out.push(entry)
}

writeFileSync(new URL("../src/emoji-data.json", import.meta.url), JSON.stringify(out))
console.log(`${out.length} emoji written`)
