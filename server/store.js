import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "coursify.json")
const TMP_FILE = path.join(DATA_DIR, "coursify.json.tmp")

function emptyState() {
  return {
    version: 5,
    educators: [],
    resources: [],
    savedByUser: {},
    followsByUser: {},
    posts: [],
    conversations: [],
    messages: [],
  }
}

let cache = null
let queue = Promise.resolve()

async function readState() {
  if (cache) return cache
  try {
    const raw = await readFile(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw)
    cache = {
      ...emptyState(),
      ...parsed,
      educators: Array.isArray(parsed.educators) ? parsed.educators : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      savedByUser: parsed.savedByUser && typeof parsed.savedByUser === "object" ? parsed.savedByUser : {},
      followsByUser:
        parsed.followsByUser && typeof parsed.followsByUser === "object" ? parsed.followsByUser : {},
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    }
  } catch {
    cache = emptyState()
  }
  return cache
}

async function writeState(next) {
  await mkdir(DATA_DIR, { recursive: true })
  const payload = `${JSON.stringify(next)}\n`
  await writeFile(TMP_FILE, payload, "utf8")
  await rename(TMP_FILE, DATA_FILE)
  cache = next
}

export function getState() {
  return readState()
}

export function mutate(updater) {
  const job = queue.then(async () => {
    const current = await readState()
    const next = await updater(current)
    if (next && next !== current) await writeState(next)
    return next ?? current
  })
  queue = job.then(
    () => undefined,
    () => undefined,
  )
  return job
}
