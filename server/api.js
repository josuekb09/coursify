import {
  conversationIdFor,
  createPasswordRecord,
  inferInstitutionLevel,
  initialsFromName,
  isInstitutionLevel,
  normalizeEmail,
  normalizeSubject,
  passwordsMatch,
  professionalEmailError,
  publicEducator,
  publicResource,
  randomToken,
  sanitizePlainText,
  uid,
} from "./security.js"
import { getState, mutate } from "./store.js"

const MAX_FILE_BYTES = 4_000_000
const STORAGE_CAP_BYTES = 10_000_000_000

function send(res, status, data) {
  if (res.headersSent) return
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(data))
}

function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body)
  }
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on("data", (chunk) => {
      size += chunk.length
      if (size > 8_000_000) {
        reject(new Error("payload too large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"))
      } catch {
        reject(new Error("invalid json"))
      }
    })
    req.on("error", reject)
  })
}

function tokenFrom(req) {
  const header = String(req.headers.authorization || "")
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim()
  return ""
}

function educatorByToken(state, token) {
  if (!token) return null
  return state.educators.find((educator) => educator.sessionToken === token) ?? null
}

function snapshotFor(state, user) {
  const mine = new Set(
    state.conversations
      .filter((conversation) => conversation.participantIds.includes(user.id))
      .map((conversation) => conversation.id),
  )
  return {
    currentUser: publicEducator(user),
    educators: state.educators.map(publicEducator),
    resources: state.resources.map(publicResource),
    posts: state.posts,
    conversations: state.conversations.filter((conversation) => mine.has(conversation.id)),
    messages: state.messages.filter((message) => mine.has(message.conversationId)),
    savedIds: state.savedByUser[user.id] ?? [],
    followsByUser: state.followsByUser,
  }
}

async function requireUser(req, res) {
  const state = await getState()
  const user = educatorByToken(state, tokenFrom(req))
  if (!user) {
    send(res, 401, { error: "Please sign in to continue." })
    return null
  }
  return { state, user }
}

function kindLabel(kind) {
  if (kind === "lesson-plan") return "Lesson plan"
  if (kind === "collection") return "Collection"
  return "Resource"
}

function displayType(kind, resource) {
  if (resource.format === "slides") return "Slides"
  if (resource.format === "video") return "Video"
  if (resource.format === "spreadsheet") return "Spreadsheet"
  if (resource.format === "code") return "Code"
  if (resource.fileName?.toLowerCase().endsWith(".pdf")) return "PDF"
  return kindLabel(kind)
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url || "/", "http://coursify.local")
  if (!url.pathname.startsWith("/api")) return false

  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*")
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.end()
    return true
  }

  try {
    await route(req, res, url)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error"
    if (message === "payload too large") {
      send(res, 413, { error: "That file is too large. Keep uploads under 4 MB." })
      return true
    }
    if (message === "invalid json") {
      send(res, 400, { error: "Could not read that request." })
      return true
    }
    console.error(error)
    send(res, 500, { error: "Something went wrong. Please try again." })
  }
  return true
}

async function route(req, res, url) {
  const { method } = req
  const path = url.pathname.replace(/\/+$/, "") || "/"

  if (method === "GET" && path === "/api/health") {
    const state = await getState()
    send(res, 200, {
      ok: true,
      hasAccounts: state.educators.length > 0,
      users: state.educators.length,
    })
    return
  }

  if (method === "POST" && path === "/api/auth/signup") {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    const name = sanitizePlainText(body.name, 80)
    const school = sanitizePlainText(body.school ?? "", 120)
    const bio = sanitizePlainText(body.bio ?? "", 800)
    const password = String(body.password ?? "")
    const emailError = professionalEmailError(email)
    if (!name) return send(res, 400, { error: "Please enter your full name." })
    if (emailError) return send(res, 400, { error: emailError })
    if (password.length < 8) return send(res, 400, { error: "Password must be at least 8 characters." })

    const secrets = await createPasswordRecord(password)
    const token = randomToken()
    const educator = {
      id: uid("edu"),
      email,
      passwordHash: secrets.passwordHash,
      passwordSalt: secrets.passwordSalt,
      name,
      initials: initialsFromName(name),
      school,
      subject: normalizeSubject(body.subject),
      bio,
      joinedYear: new Date().getFullYear(),
      storageBytes: 0,
      verified: true,
      institutionLevel: isInstitutionLevel(body.institutionLevel)
        ? body.institutionLevel
        : inferInstitutionLevel(email, school),
      sessionToken: token,
    }

    const result = await mutate((state) => {
      if (state.educators.some((item) => item.email === email)) return state
      return {
        ...state,
        educators: [...state.educators, educator],
        followsByUser: { ...state.followsByUser, [educator.id]: [] },
        savedByUser: { ...state.savedByUser, [educator.id]: [] },
      }
    })
    if (result.educators.some((item) => item.email === email && item.id !== educator.id)) {
      return send(res, 409, { error: "An educator with that email already has an account. Sign in instead." })
    }
    if (!result.educators.some((item) => item.id === educator.id)) {
      return send(res, 409, { error: "An educator with that email already has an account. Sign in instead." })
    }
    send(res, 201, { token, snapshot: snapshotFor(result, educator) })
    return
  }

  if (method === "POST" && path === "/api/auth/login") {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    const password = String(body.password ?? "")
    const state = await getState()
    const match = state.educators.find((educator) => educator.email === email)
    if (!match || !(await passwordsMatch(password, match.passwordSalt, match.passwordHash))) {
      return send(res, 401, { error: "Email or password is incorrect." })
    }
    const token = randomToken()
    const next = await mutate((current) => ({
      ...current,
      educators: current.educators.map((educator) =>
        educator.id === match.id ? { ...educator, sessionToken: token } : educator,
      ),
    }))
    const user = next.educators.find((educator) => educator.id === match.id)
    send(res, 200, { token, snapshot: snapshotFor(next, user) })
    return
  }

  if (method === "POST" && path === "/api/auth/logout") {
    const auth = await requireUser(req, res)
    if (!auth) return
    await mutate((current) => ({
      ...current,
      educators: current.educators.map((educator) =>
        educator.id === auth.user.id ? { ...educator, sessionToken: randomToken() } : educator,
      ),
    }))
    send(res, 200, { ok: true })
    return
  }

  if (method === "GET" && path === "/api/snapshot") {
    const auth = await requireUser(req, res)
    if (!auth) return
    send(res, 200, snapshotFor(auth.state, auth.user))
    return
  }

  if (method === "PATCH" && path === "/api/me") {
    const auth = await requireUser(req, res)
    if (!auth) return
    const body = await readBody(req)
    const next = await mutate((current) => ({
      ...current,
      educators: current.educators.map((educator) => {
        if (educator.id !== auth.user.id) return educator
        const name = sanitizePlainText(body.name ?? educator.name, 80) || educator.name
        const nextPhoto =
          body.photoData === null ? undefined : (body.photoData ?? educator.photoData)
        const photo =
          typeof nextPhoto === "string" && nextPhoto.startsWith("data:image/")
            ? nextPhoto.slice(0, 900_000)
            : nextPhoto
        const school = sanitizePlainText(body.school ?? educator.school, 120)
        return {
          ...educator,
          name,
          initials: initialsFromName(name),
          school,
          subject: body.subject ? normalizeSubject(body.subject) : educator.subject,
          bio: sanitizePlainText(body.bio ?? educator.bio, 800),
          photoData: photo,
          institutionLevel: isInstitutionLevel(body.institutionLevel)
            ? body.institutionLevel
            : educator.institutionLevel,
        }
      }),
    }))
    const user = next.educators.find((educator) => educator.id === auth.user.id)
    send(res, 200, snapshotFor(next, user))
    return
  }

  if (method === "POST" && path === "/api/resources") {
    const auth = await requireUser(req, res)
    if (!auth) return
    const body = await readBody(req)
    const title = sanitizePlainText(body.title, 160)
    if (!title) return send(res, 400, { error: "Give the resource a title." })
    const link = sanitizePlainText(body.sourceUrl ?? "", 500)
    const fileData = typeof body.fileData === "string" ? body.fileData : undefined
    const fileBytes = Number(body.fileBytes) || 0
    if (!fileData && !link) return send(res, 400, { error: "Attach a file or add a resource link." })
    if (fileBytes > MAX_FILE_BYTES) {
      return send(res, 400, { error: "Please keep uploads under 4 MB for this workspace." })
    }
    if (auth.user.storageBytes + fileBytes > STORAGE_CAP_BYTES) {
      return send(res, 400, { error: "Not enough storage for this file." })
    }
    const fileName = body.fileName ? sanitizePlainText(body.fileName, 120) : undefined
    const resource = {
      id: uid("res"),
      title,
      authorId: auth.user.id,
      subject: normalizeSubject(body.subject),
      grade: sanitizePlainText(body.grade ?? "Grade 10", 40) || "Grade 10",
      kind: ["resource", "lesson-plan", "collection"].includes(body.kind) ? body.kind : "resource",
      format: ["video", "slides", "document", "spreadsheet", "code"].includes(body.format)
        ? body.format
        : "document",
      mimeType: body.mimeType ? String(body.mimeType).slice(0, 120) : undefined,
      type: "",
      downloads: 0,
      saves: 0,
      fileName,
      fileSize: fileBytes ? `${(fileBytes / 1_000_000).toFixed(1)} MB` : undefined,
      fileBytes: fileBytes || undefined,
      fileData,
      sourceUrl: link || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    resource.type = displayType(kindLabel(resource.kind), resource)
    const post = {
      id: uid("post"),
      authorId: auth.user.id,
      body: `Shared ${resource.title} with the library.`,
      resourceId: resource.id,
      createdAt: new Date().toISOString(),
    }
    const next = await mutate((current) => ({
      ...current,
      resources: [resource, ...current.resources],
      posts: [post, ...current.posts],
      educators: current.educators.map((educator) =>
        educator.id === auth.user.id
          ? { ...educator, storageBytes: educator.storageBytes + fileBytes }
          : educator,
      ),
    }))
    const user = next.educators.find((educator) => educator.id === auth.user.id)
    send(res, 201, snapshotFor(next, user))
    return
  }

  const resourceMatch = path.match(/^\/api\/resources\/([^/]+)(?:\/(download|save))?$/)
  if (resourceMatch) {
    const auth = await requireUser(req, res)
    if (!auth) return
    const resourceId = decodeURIComponent(resourceMatch[1])
    const extra = resourceMatch[2]

    if (method === "GET" && !extra) {
      const resource = auth.state.resources.find((item) => item.id === resourceId)
      if (!resource) return send(res, 404, { error: "That resource is no longer in the library." })
      send(res, 200, { ...publicResource(resource), fileData: resource.fileData })
      return
    }

    if (method === "DELETE" && !extra) {
      const resource = auth.state.resources.find((item) => item.id === resourceId)
      if (!resource || resource.authorId !== auth.user.id) {
        return send(res, 404, { error: "That resource is no longer in the library." })
      }
      const size = resource.fileBytes ?? 0
      const next = await mutate((current) => ({
        ...current,
        resources: current.resources.filter((item) => item.id !== resourceId),
        posts: current.posts.filter((post) => post.resourceId !== resourceId),
        savedByUser: Object.fromEntries(
          Object.entries(current.savedByUser).map(([userId, ids]) => [
            userId,
            ids.filter((item) => item !== resourceId),
          ]),
        ),
        educators: current.educators.map((educator) =>
          educator.id === auth.user.id
            ? { ...educator, storageBytes: Math.max(0, educator.storageBytes - size) }
            : educator,
        ),
      }))
      const user = next.educators.find((educator) => educator.id === auth.user.id)
      send(res, 200, snapshotFor(next, user))
      return
    }

    if (method === "POST" && extra === "download") {
      const resource = auth.state.resources.find((item) => item.id === resourceId)
      if (!resource) return send(res, 404, { error: "That resource is no longer in the library." })
      const next = await mutate((current) => ({
        ...current,
        resources: current.resources.map((item) =>
          item.id === resourceId ? { ...item, downloads: item.downloads + 1 } : item,
        ),
      }))
      const updated = next.resources.find((item) => item.id === resourceId)
      send(res, 200, { ...publicResource(updated), fileData: updated.fileData })
      return
    }

    if (method === "POST" && extra === "save") {
      const next = await mutate((current) => {
        const mine = current.savedByUser[auth.user.id] ?? []
        const saved = mine.includes(resourceId)
        if (!current.resources.some((item) => item.id === resourceId)) return current
        return {
          ...current,
          savedByUser: {
            ...current.savedByUser,
            [auth.user.id]: saved ? mine.filter((id) => id !== resourceId) : [...mine, resourceId],
          },
          resources: current.resources.map((item) =>
            item.id === resourceId
              ? { ...item, saves: Math.max(0, item.saves + (saved ? -1 : 1)) }
              : item,
          ),
        }
      })
      const user = next.educators.find((educator) => educator.id === auth.user.id)
      send(res, 200, snapshotFor(next, user))
      return
    }
  }

  const followMatch = path.match(/^\/api\/follows\/([^/]+)$/)
  if (method === "POST" && followMatch) {
    const auth = await requireUser(req, res)
    if (!auth) return
    const educatorId = decodeURIComponent(followMatch[1])
    if (educatorId === auth.user.id) return send(res, 400, { error: "You cannot follow yourself." })
    const next = await mutate((current) => {
      if (!current.educators.some((educator) => educator.id === educatorId)) return current
      const mine = current.followsByUser[auth.user.id] ?? []
      const following = mine.includes(educatorId)
      return {
        ...current,
        followsByUser: {
          ...current.followsByUser,
          [auth.user.id]: following ? mine.filter((id) => id !== educatorId) : [...mine, educatorId],
        },
      }
    })
    const user = next.educators.find((educator) => educator.id === auth.user.id)
    send(res, 200, snapshotFor(next, user))
    return
  }

  if (method === "POST" && path === "/api/posts") {
    const auth = await requireUser(req, res)
    if (!auth) return
    const body = await readBody(req)
    const text = sanitizePlainText(body.body ?? "", 800)
    const resourceId = body.resourceId ? String(body.resourceId).slice(0, 80) : undefined
    if (!text && !resourceId) return send(res, 400, { error: "Write a short update before posting." })
    if (resourceId && !auth.state.resources.some((item) => item.id === resourceId)) {
      return send(res, 400, { error: "That resource is no longer in the library." })
    }
    const post = {
      id: uid("post"),
      authorId: auth.user.id,
      body: text || "Shared a resource with colleagues.",
      resourceId,
      createdAt: new Date().toISOString(),
    }
    const next = await mutate((current) => ({ ...current, posts: [post, ...current.posts] }))
    const user = next.educators.find((educator) => educator.id === auth.user.id)
    send(res, 201, snapshotFor(next, user))
    return
  }

  if (method === "POST" && path === "/api/messages") {
    const auth = await requireUser(req, res)
    if (!auth) return
    const body = await readBody(req)
    const peerId = String(body.peerId ?? "")
    const text = sanitizePlainText(body.body ?? "", 2000)
    if (!peerId || peerId === auth.user.id) {
      return send(res, 400, { error: "You cannot message yourself." })
    }
    if (!text) return send(res, 400, { error: "Write a message first." })
    if (!auth.state.educators.some((educator) => educator.id === peerId)) {
      return send(res, 404, { error: "That colleague is no longer on Coursify." })
    }
    const now = new Date().toISOString()
    const id = conversationIdFor(auth.user.id, peerId)
    const message = {
      id: uid("msg"),
      conversationId: id,
      senderId: auth.user.id,
      body: text,
      createdAt: now,
    }
    const next = await mutate((current) => {
      const existing = current.conversations.find((item) => item.id === id)
      const conversation = existing
        ? {
            ...existing,
            updatedAt: now,
            lastReadAt: { ...existing.lastReadAt, [auth.user.id]: now },
          }
        : {
            id,
            participantIds: [auth.user.id, peerId].sort(),
            updatedAt: now,
            lastReadAt: { [auth.user.id]: now },
          }
      return {
        ...current,
        conversations: [conversation, ...current.conversations.filter((item) => item.id !== id)],
        messages: [...current.messages, message],
      }
    })
    const user = next.educators.find((educator) => educator.id === auth.user.id)
    send(res, 201, snapshotFor(next, user))
    return
  }

  const readMatch = path.match(/^\/api\/conversations\/([^/]+)\/read$/)
  if (method === "POST" && readMatch) {
    const auth = await requireUser(req, res)
    if (!auth) return
    const conversationId = decodeURIComponent(readMatch[1])
    const now = new Date().toISOString()
    const next = await mutate((current) => ({
      ...current,
      conversations: current.conversations.map((item) =>
        item.id === conversationId && item.participantIds.includes(auth.user.id)
          ? { ...item, lastReadAt: { ...item.lastReadAt, [auth.user.id]: now } }
          : item,
      ),
    }))
    const user = next.educators.find((educator) => educator.id === auth.user.id)
    send(res, 200, snapshotFor(next, user))
    return
  }

  send(res, 404, { error: "Not found." })
}
