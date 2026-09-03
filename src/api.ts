export type Snapshot = {
  currentUser: import("@/types").Educator
  educators: import("@/types").Educator[]
  resources: import("@/types").Resource[]
  posts: import("@/types").Post[]
  conversations: import("@/types").Conversation[]
  messages: import("@/types").ChatMessage[]
  savedIds: string[]
  followsByUser: Record<string, string[]>
}

const SESSION_KEY = "coursify.session.v1"

export function loadSessionToken() {
  try {
    return localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function saveSessionToken(token: string | null) {
  try {
    if (token) localStorage.setItem(SESSION_KEY, token)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* private mode */
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const response = await fetch(path, { ...init, headers })
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    throw new Error("Coursify could not reach the shared server. Please try again in a moment.")
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.")
  }
  return data
}

export function getHealth() {
  return request<{ ok: boolean; hasAccounts: boolean; users: number }>("/api/health")
}

export function signup(body: unknown) {
  return request<{ token: string; snapshot: Snapshot }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function login(email: string, password: string) {
  return request<{ token: string; snapshot: Snapshot }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export function logout(token: string) {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }, token)
}

export function getSnapshot(token: string) {
  return request<Snapshot>("/api/snapshot", {}, token)
}

export function patchProfile(token: string, body: unknown) {
  return request<Snapshot>("/api/me", { method: "PATCH", body: JSON.stringify(body) }, token)
}

export function createResource(token: string, body: unknown) {
  return request<Snapshot>("/api/resources", { method: "POST", body: JSON.stringify(body) }, token)
}

export function getResource(token: string, id: string) {
  return request<import("@/types").Resource>(`/api/resources/${encodeURIComponent(id)}`, {}, token)
}

export function removeResource(token: string, id: string) {
  return request<Snapshot>(`/api/resources/${encodeURIComponent(id)}`, { method: "DELETE" }, token)
}

export function downloadResource(token: string, id: string) {
  return request<import("@/types").Resource>(
    `/api/resources/${encodeURIComponent(id)}/download`,
    { method: "POST" },
    token,
  )
}

export function toggleSave(token: string, id: string) {
  return request<Snapshot>(
    `/api/resources/${encodeURIComponent(id)}/save`,
    { method: "POST" },
    token,
  )
}

export function toggleFollow(token: string, id: string) {
  return request<Snapshot>(`/api/follows/${encodeURIComponent(id)}`, { method: "POST" }, token)
}

export function createPost(token: string, body: string, resourceId?: string) {
  return request<Snapshot>(
    "/api/posts",
    { method: "POST", body: JSON.stringify({ body, resourceId }) },
    token,
  )
}

export function sendMessage(token: string, peerId: string, body: string) {
  return request<Snapshot>(
    "/api/messages",
    { method: "POST", body: JSON.stringify({ peerId, body }) },
    token,
  )
}

export function markRead(token: string, conversationId: string) {
  return request<Snapshot>(
    `/api/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "POST" },
    token,
  )
}
