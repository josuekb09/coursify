import { MAX_FILE_BYTES, STORAGE_CAP_BYTES, normalizeSubject } from "@/data"
import { displayType, inferResourceFormat, uploadIssue } from "@/formats"
import {
  createPasswordRecord,
  inferInstitutionLevel,
  isInstitutionLevel,
  type PersistedEducator,
  passwordsMatch,
  professionalEmailError,
  publicEducator,
  randomToken,
  sanitizeEducator,
  sanitizePlainText,
  normalizeEmail,
} from "@/security"
import { sanitizeDeck } from "@/slides"
import type {
  ChatMessage,
  Conversation,
  Educator,
  Post,
  ProfilePatch,
  Resource,
  Session,
  SignupInput,
  Toast,
  UploadInput,
} from "@/types"
import { conversationIdFor, initialsFromName, kindLabel, uid } from "@/utils"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

const STORAGE_KEY = "coursify.store.v4"
const LEGACY_KEYS = ["coursify.store.v3", "coursify.store.v2"]

type Persisted = {
  version: 4
  educators: PersistedEducator[]
  resources: Resource[]
  savedByUser: Record<string, string[]>
  followsByUser: Record<string, string[]>
  posts: Post[]
  conversations: Conversation[]
  messages: ChatMessage[]
  session: Session | null
}

function emptyState(): Persisted {
  return {
    version: 4,
    educators: [],
    resources: [],
    savedByUser: {},
    followsByUser: {},
    posts: [],
    conversations: [],
    messages: [],
    session: null,
  }
}

function hydrateEducators(raw: unknown[]): PersistedEducator[] {
  return raw
    .map((item) => sanitizeEducator(item as Partial<PersistedEducator>))
    .filter((item): item is PersistedEducator => item !== null)
}

function hydratePosts(raw: unknown): Post[] {
  if (!Array.isArray(raw)) return []
  const posts: Post[] = []
  for (const item of raw) {
    const row = item as Partial<Post>
    if (!row.id || !row.authorId) continue
    const body = sanitizePlainText(String(row.body ?? ""), 800)
    if (!body && !row.resourceId) continue
    const post: Post = {
      id: String(row.id).slice(0, 80),
      authorId: String(row.authorId).slice(0, 80),
      body,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    }
    if (row.resourceId) post.resourceId = String(row.resourceId).slice(0, 80)
    posts.push(post)
  }
  return posts
}

function hydrateConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item as Partial<Conversation>
      const ids = Array.isArray(row.participantIds) ? row.participantIds.map(String) : []
      if (ids.length !== 2) return null
      const sorted = [...ids].sort() as [string, string]
      return {
        id: typeof row.id === "string" ? row.id : conversationIdFor(sorted[0], sorted[1]),
        participantIds: sorted,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
        lastReadAt:
          row.lastReadAt && typeof row.lastReadAt === "object"
            ? (row.lastReadAt as Record<string, string>)
            : {},
      }
    })
    .filter((item): item is Conversation => item !== null)
}

function hydrateMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item as Partial<ChatMessage>
      const body = sanitizePlainText(String(row.body ?? ""), 2000)
      if (!row.id || !row.conversationId || !row.senderId || !body) return null
      return {
        id: String(row.id).slice(0, 80),
        conversationId: String(row.conversationId).slice(0, 120),
        senderId: String(row.senderId).slice(0, 80),
        body,
        createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      }
    })
    .filter((item): item is ChatMessage => item !== null)
}

function loadPersisted(): Persisted {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key)
        if (raw) break
      }
    }
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as {
      version?: number
      educators?: unknown[]
      resources?: Resource[]
      savedByUser?: Record<string, string[]>
      followsByUser?: Record<string, string[]>
      posts?: unknown
      conversations?: unknown
      messages?: unknown
      session?: Session | null
      sessionId?: string | null
    }
    if (!Array.isArray(parsed.educators)) return emptyState()
    const educators = hydrateEducators(parsed.educators)
    const sessionFromV3 = parsed.session ?? null
    const legacyId = parsed.sessionId ?? null
    let session = sessionFromV3
    if (!session && legacyId) {
      const match = educators.find((educator) => educator.id === legacyId)
      if (match?.sessionToken) session = { userId: match.id, token: match.sessionToken }
    }
    if (session) {
      const owner = educators.find((educator) => educator.id === session!.userId)
      if (!owner || owner.sessionToken !== session.token) session = null
    }
    return {
      version: 4,
      educators,
      resources: (parsed.resources ?? []).map((resource) => {
        const title = sanitizePlainText(resource.title ?? "", 160)
        const format = inferResourceFormat(resource)
        const slides = sanitizeDeck(resource.slides)
        return {
          ...resource,
          title,
          subject: normalizeSubject(String(resource.subject)),
          format,
          type: resource.type || displayType(kindLabel(resource.kind), { ...resource, format }),
          fileName: resource.fileName ? sanitizePlainText(resource.fileName, 120) : undefined,
          sourceUrl: resource.sourceUrl ? sanitizePlainText(resource.sourceUrl, 500) : undefined,
          slides: slides.length > 0 ? slides : undefined,
        }
      }),
      savedByUser: parsed.savedByUser ?? {},
      followsByUser: parsed.followsByUser ?? {},
      posts: hydratePosts(parsed.posts),
      conversations: hydrateConversations(parsed.conversations),
      messages: hydrateMessages(parsed.messages),
      session,
    }
  } catch {
    return emptyState()
  }
}

function persist(state: Persisted) {
  const safe: Persisted = {
    ...state,
    educators: state.educators.map((educator) => {
      const { password: _legacy, ...rest } = educator
      return rest
    }),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
}

function toPublic(educator: PersistedEducator): Educator {
  return publicEducator(educator)
}

type AppStore = {
  educators: Educator[]
  resources: Resource[]
  posts: Post[]
  conversations: Conversation[]
  messages: ChatMessage[]
  currentUser: Educator | null
  hasAccounts: boolean
  myResources: Resource[]
  savedResources: Resource[]
  feedPosts: Post[]
  unreadCount: number
  toasts: Toast[]
  login: (email: string, password: string) => Promise<string | null>
  signup: (input: SignupInput) => Promise<string | null>
  logout: () => void
  updateProfile: (patch: ProfilePatch) => void
  uploadResource: (input: UploadInput) => Promise<string | null>
  deleteResource: (id: string) => void
  downloadResource: (id: string) => Resource | undefined
  toggleSave: (id: string) => void
  isSaved: (id: string) => boolean
  toggleFollow: (educatorId: string) => void
  isFollowing: (educatorId: string) => boolean
  followsYou: (educatorId: string) => boolean
  followBackSuggestions: Educator[]
  followerCount: (educatorId: string) => number
  followingCount: (educatorId: string) => number
  publishPost: (body: string, resourceId?: string) => string | null
  sendMessage: (peerId: string, body: string) => string | null
  markConversationRead: (conversationId: string) => void
  conversationWith: (peerId: string) => Conversation | undefined
  messagesFor: (conversationId: string) => ChatMessage[]
  unreadIn: (conversationId: string) => number
  educatorById: (id: string) => Educator | undefined
  authorName: (authorId: string) => string
  notify: (message: string) => void
}

const AppContext = createContext<AppStore | null>(null)

export default function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => loadPersisted())
  const [toasts, setToasts] = useState<Toast[]>([])

  const commit = useCallback((updater: (current: Persisted) => Persisted) => {
    setState((current) => {
      const next = updater(current)
      persist(next)
      return next
    })
  }, [])

  const notify = useCallback((message: string) => {
    const id = uid("toast")
    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2800)
  }, [])

  const storedUser = useMemo(() => {
    if (!state.session) return null
    const match = state.educators.find((educator) => educator.id === state.session?.userId)
    if (!match || match.sessionToken !== state.session.token) return null
    return match
  }, [state.educators, state.session])

  const currentUser = storedUser ? toPublic(storedUser) : null

  const login = useCallback(
    async (email: string, password: string) => {
      const normalized = normalizeEmail(email)
      const match = state.educators.find((educator) => educator.email === normalized)
      if (!match) return "Email or password is incorrect."
      const ok = await passwordsMatch(password, match.passwordSalt, match.passwordHash, match.password)
      if (!ok) return "Email or password is incorrect."

      const token = randomToken()
      let passwordHash = match.passwordHash
      let passwordSalt = match.passwordSalt
      if (!passwordHash || !passwordSalt) {
        const record = await createPasswordRecord(password)
        passwordHash = record.passwordHash
        passwordSalt = record.passwordSalt
      }

      commit((current) => ({
        ...current,
        session: { userId: match.id, token },
        educators: current.educators.map((educator) =>
          educator.id === match.id
            ? {
                ...educator,
                passwordHash,
                passwordSalt,
                password: undefined,
                sessionToken: token,
                verified: educator.verified,
              }
            : educator,
        ),
      }))
      notify(`Welcome back, ${match.name.split(" ")[0]}.`)
      return null
    },
    [commit, notify, state.educators],
  )

  const signup = useCallback(
    async (input: SignupInput) => {
      const email = normalizeEmail(input.email)
      const name = sanitizePlainText(input.name, 80)
      const school = sanitizePlainText(input.school ?? "", 120)
      const bio = sanitizePlainText(input.bio ?? "", 800)
      const emailError = professionalEmailError(email)
      if (!name) return "Please enter your full name."
      if (emailError) return emailError
      if (input.password.length < 8) return "Password must be at least 8 characters."
      if (state.educators.some((educator) => educator.email === email)) {
        return "An educator with that email already has an account. Sign in instead."
      }

      const secrets = await createPasswordRecord(input.password)
      const token = randomToken()
      const educator: PersistedEducator = {
        id: uid("edu"),
        email,
        passwordHash: secrets.passwordHash,
        passwordSalt: secrets.passwordSalt,
        name,
        initials: initialsFromName(name),
        school,
        subject: input.subject ?? "Mathematics",
        bio,
        joinedYear: new Date().getFullYear(),
        storageBytes: 0,
        verified: true,
        institutionLevel: isInstitutionLevel(input.institutionLevel)
          ? input.institutionLevel
          : inferInstitutionLevel(email, school),
        sessionToken: token,
      }

      commit((current) => ({
        ...current,
        educators: [...current.educators, educator],
        session: { userId: educator.id, token },
      }))
      notify(`Welcome to Coursify, ${name.split(" ")[0]}.`)
      return null
    },
    [commit, notify, state.educators],
  )

  const logout = useCallback(() => {
    commit((current) => ({
      ...current,
      session: null,
      educators: current.educators.map((educator) =>
        educator.id === current.session?.userId ? { ...educator, sessionToken: randomToken() } : educator,
      ),
    }))
  }, [commit])

  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      if (!state.session) return
      commit((current) => ({
        ...current,
        educators: current.educators.map((educator) => {
          if (educator.id !== current.session?.userId) return educator
          const name = sanitizePlainText(patch.name ?? educator.name, 80) || educator.name
          const nextPhoto =
            patch.photoData === null ? undefined : (patch.photoData ?? educator.photoData)
          const school = sanitizePlainText(patch.school ?? educator.school, 120) || educator.school
          return {
            ...educator,
            name,
            initials: initialsFromName(name),
            school,
            subject: patch.subject ?? educator.subject,
            bio: sanitizePlainText(patch.bio ?? educator.bio, 800),
            photoData: nextPhoto,
            institutionLevel: isInstitutionLevel(patch.institutionLevel)
              ? patch.institutionLevel
              : educator.institutionLevel,
          }
        }),
      }))
      notify("Profile updated.")
    },
    [commit, notify, state.session],
  )

  const uploadResource = useCallback(
    async (input: UploadInput) => {
      if (!state.session || !currentUser) return "Sign in to upload."
      const title = sanitizePlainText(input.title, 160)
      if (!title) return "Give the resource a title."
      const link = sanitizePlainText(input.sourceUrl ?? "", 500)
      const formatIssue = uploadIssue({ ...input, sourceUrl: link })
      if (formatIssue) return formatIssue
      if (input.file && input.file.size > MAX_FILE_BYTES) {
        return "Please keep uploads under 4 MB for this workspace."
      }
      const size = input.file?.size ?? 0
      if (currentUser.storageBytes + size > STORAGE_CAP_BYTES) {
        return "Not enough storage for this file."
      }

      let fileData: string | undefined
      if (input.file) {
        try {
          fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error("read"))
            reader.readAsDataURL(input.file!)
          })
        } catch {
          return "Could not read that file."
        }
      }

      const fileName = input.file?.name ? sanitizePlainText(input.file.name, 120) : undefined
      const resource: Resource = {
        id: uid("res"),
        title,
        authorId: currentUser.id,
        subject: input.subject,
        grade: input.grade,
        kind: input.kind,
        format: input.format,
        mimeType: input.file?.type || undefined,
        type: displayType(kindLabel(input.kind), {
          format: input.format,
          fileName,
          sourceUrl: link || undefined,
        }),
        downloads: 0,
        saves: 0,
        fileName,
        fileSize: input.file ? `${(input.file.size / 1_000_000).toFixed(1)} MB` : undefined,
        fileBytes: input.file?.size,
        fileData,
        sourceUrl: link || undefined,
        createdAt: new Date().toISOString().slice(0, 10),
      }

      const post: Post = {
        id: uid("post"),
        authorId: currentUser.id,
        body: `Shared ${resource.title} with the library.`,
        resourceId: resource.id,
        createdAt: new Date().toISOString(),
      }

      commit((current) => ({
        ...current,
        resources: [resource, ...current.resources],
        posts: [post, ...current.posts],
        educators: current.educators.map((educator) =>
          educator.id === current.session?.userId
            ? { ...educator, storageBytes: educator.storageBytes + size }
            : educator,
        ),
      }))
      notify(`${resource.title} was added to your library.`)
      return null
    },
    [commit, currentUser, notify, state.session],
  )

  const deleteResource = useCallback(
    (id: string) => {
      if (!state.session) return
      const resource = state.resources.find((item) => item.id === id)
      if (!resource || resource.authorId !== state.session.userId) return
      const size = resource.fileBytes ?? 0
      commit((current) => ({
        ...current,
        resources: current.resources.filter((item) => item.id !== id),
        posts: current.posts.filter((post) => post.resourceId !== id),
        savedByUser: Object.fromEntries(
          Object.entries(current.savedByUser).map(([userId, ids]) => [
            userId,
            ids.filter((item) => item !== id),
          ]),
        ),
        educators: current.educators.map((educator) =>
          educator.id === current.session?.userId
            ? { ...educator, storageBytes: Math.max(0, educator.storageBytes - size) }
            : educator,
        ),
      }))
      notify("Resource removed from your library.")
    },
    [commit, notify, state.resources, state.session],
  )

  const downloadResource = useCallback(
    (id: string) => {
      const resource = state.resources.find((item) => item.id === id)
      if (!resource) return undefined
      commit((current) => ({
        ...current,
        resources: current.resources.map((item) =>
          item.id === id ? { ...item, downloads: item.downloads + 1 } : item,
        ),
      }))
      return { ...resource, downloads: resource.downloads + 1 }
    },
    [commit, state.resources],
  )

  const toggleSave = useCallback(
    (id: string) => {
      if (!state.session) return
      commit((current) => {
        const userId = current.session!.userId
        const mine = current.savedByUser[userId] ?? []
        const saved = mine.includes(id)
        const nextMine = saved ? mine.filter((item) => item !== id) : [...mine, id]
        return {
          ...current,
          savedByUser: { ...current.savedByUser, [userId]: nextMine },
          resources: current.resources.map((item) =>
            item.id === id
              ? { ...item, saves: Math.max(0, item.saves + (saved ? -1 : 1)) }
              : item,
          ),
        }
      })
    },
    [commit, state.session],
  )

  const isSaved = useCallback(
    (id: string) => {
      if (!state.session) return false
      return (state.savedByUser[state.session.userId] ?? []).includes(id)
    },
    [state.savedByUser, state.session],
  )

  const toggleFollow = useCallback(
    (educatorId: string) => {
      if (!state.session || educatorId === state.session.userId) return
      commit((current) => {
        const userId = current.session!.userId
        const mine = current.followsByUser[userId] ?? []
        const following = mine.includes(educatorId)
        return {
          ...current,
          followsByUser: {
            ...current.followsByUser,
            [userId]: following ? mine.filter((id) => id !== educatorId) : [...mine, educatorId],
          },
        }
      })
    },
    [commit, state.session],
  )

  const isFollowing = useCallback(
    (educatorId: string) => {
      if (!state.session) return false
      return (state.followsByUser[state.session.userId] ?? []).includes(educatorId)
    },
    [state.followsByUser, state.session],
  )

  const followsYou = useCallback(
    (educatorId: string) => {
      if (!state.session) return false
      return (state.followsByUser[educatorId] ?? []).includes(state.session.userId)
    },
    [state.followsByUser, state.session],
  )

  const followBackSuggestions = useMemo(() => {
    if (!state.session) return []
    const myId = state.session.userId
    const following = state.followsByUser[myId] ?? []
    return state.educators
      .filter((educator) => educator.id !== myId)
      .filter((educator) => (state.followsByUser[educator.id] ?? []).includes(myId))
      .filter((educator) => !following.includes(educator.id))
      .map(toPublic)
  }, [state.educators, state.followsByUser, state.session])

  const followerCount = useCallback(
    (educatorId: string) =>
      Object.values(state.followsByUser).filter((ids) => ids.includes(educatorId)).length,
    [state.followsByUser],
  )

  const followingCount = useCallback(
    (educatorId: string) => (state.followsByUser[educatorId] ?? []).length,
    [state.followsByUser],
  )

  const publishPost = useCallback(
    (body: string, resourceId?: string) => {
      if (!state.session) return "Sign in to post."
      const text = sanitizePlainText(body, 800)
      if (!text && !resourceId) return "Write a short update before posting."
      if (resourceId && !state.resources.some((item) => item.id === resourceId)) {
        return "That resource is no longer in the library."
      }
      const post: Post = {
        id: uid("post"),
        authorId: state.session.userId,
        body: text || "Shared a resource with colleagues.",
        resourceId,
        createdAt: new Date().toISOString(),
      }
      commit((current) => ({ ...current, posts: [post, ...current.posts] }))
      notify("Posted to the academic feed.")
      return null
    },
    [commit, notify, state.resources, state.session],
  )

  const sendMessage = useCallback(
    (peerId: string, body: string) => {
      if (!state.session) return "Sign in to send a message."
      if (peerId === state.session.userId) return "You cannot message yourself."
      const text = sanitizePlainText(body, 2000)
      if (!text) return "Write a message first."
      const now = new Date().toISOString()
      const id = conversationIdFor(state.session.userId, peerId)
      const message: ChatMessage = {
        id: uid("msg"),
        conversationId: id,
        senderId: state.session.userId,
        body: text,
        createdAt: now,
      }
      commit((current) => {
        const existing = current.conversations.find((item) => item.id === id)
        const conversation: Conversation = existing
          ? { ...existing, updatedAt: now, lastReadAt: { ...existing.lastReadAt, [current.session!.userId]: now } }
          : {
              id,
              participantIds: [current.session!.userId, peerId].sort() as [string, string],
              updatedAt: now,
              lastReadAt: { [current.session!.userId]: now },
            }
        return {
          ...current,
          conversations: [conversation, ...current.conversations.filter((item) => item.id !== id)],
          messages: [...current.messages, message],
        }
      })
      return null
    },
    [commit, state.session],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!state.session) return
      const now = new Date().toISOString()
      commit((current) => ({
        ...current,
        conversations: current.conversations.map((item) =>
          item.id === conversationId
            ? { ...item, lastReadAt: { ...item.lastReadAt, [current.session!.userId]: now } }
            : item,
        ),
      }))
    },
    [commit, state.session],
  )

  const conversationWith = useCallback(
    (peerId: string) => {
      if (!state.session) return undefined
      const id = conversationIdFor(state.session.userId, peerId)
      return state.conversations.find((item) => item.id === id)
    },
    [state.conversations, state.session],
  )

  const messagesFor = useCallback(
    (conversationId: string) =>
      state.messages.filter((item) => item.conversationId === conversationId),
    [state.messages],
  )

  const unreadIn = useCallback(
    (conversationId: string) => {
      if (!state.session) return 0
      const conversation = state.conversations.find((item) => item.id === conversationId)
      const lastRead = conversation?.lastReadAt[state.session.userId] ?? ""
      return state.messages.filter(
        (item) =>
          item.conversationId === conversationId &&
          item.senderId !== state.session!.userId &&
          item.createdAt > lastRead,
      ).length
    },
    [state.conversations, state.messages, state.session],
  )

  const myResources = useMemo(() => {
    if (!state.session) return []
    return state.resources.filter((item) => item.authorId === state.session?.userId)
  }, [state.resources, state.session])

  const savedResources = useMemo(() => {
    if (!state.session) return []
    const ids = new Set(state.savedByUser[state.session.userId] ?? [])
    return state.resources.filter((item) => ids.has(item.id))
  }, [state.resources, state.savedByUser, state.session])

  const feedPosts = useMemo(() => {
    if (!state.session) return []
    const following = new Set(state.followsByUser[state.session.userId] ?? [])
    return state.posts.filter(
      (post) => post.authorId === state.session?.userId || following.has(post.authorId),
    )
  }, [state.followsByUser, state.posts, state.session])

  const unreadCount = useMemo(() => {
    if (!state.session) return 0
    return state.conversations.reduce((sum, conversation) => sum + unreadIn(conversation.id), 0)
  }, [state.conversations, state.session, unreadIn])

  const educatorLookup = useCallback(
    (id: string) => {
      const match = state.educators.find((educator) => educator.id === id)
      return match ? toPublic(match) : undefined
    },
    [state.educators],
  )

  const authorName = useCallback(
    (authorId: string) => educatorLookup(authorId)?.name ?? "Educator",
    [educatorLookup],
  )

  const value = useMemo<AppStore>(
    () => ({
      educators: state.educators.map(toPublic),
      resources: state.resources,
      posts: state.posts,
      conversations: state.conversations,
      messages: state.messages,
      currentUser,
      hasAccounts: state.educators.length > 0,
      myResources,
      savedResources,
      feedPosts,
      unreadCount,
      toasts,
      login,
      signup,
      logout,
      updateProfile,
      uploadResource,
      deleteResource,
      downloadResource,
      toggleSave,
      isSaved,
      toggleFollow,
      isFollowing,
      followsYou,
      followBackSuggestions,
      followerCount,
      followingCount,
      publishPost,
      sendMessage,
      markConversationRead,
      conversationWith,
      messagesFor,
      unreadIn,
      educatorById: educatorLookup,
      authorName,
      notify,
    }),
    [
      authorName,
      conversationWith,
      currentUser,
      deleteResource,
      downloadResource,
      educatorLookup,
      feedPosts,
      followerCount,
      followBackSuggestions,
      followingCount,
      followsYou,
      isFollowing,
      isSaved,
      login,
      logout,
      markConversationRead,
      messagesFor,
      myResources,
      notify,
      publishPost,
      savedResources,
      sendMessage,
      signup,
      state.conversations,
      state.educators,
      state.messages,
      state.posts,
      state.resources,
      toasts,
      toggleFollow,
      toggleSave,
      unreadCount,
      unreadIn,
      updateProfile,
      uploadResource,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within AppProvider")
  return context
}
