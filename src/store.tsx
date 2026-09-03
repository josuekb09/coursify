import { MAX_FILE_BYTES, STORAGE_CAP_BYTES } from "@/data"
import { uploadIssue } from "@/formats"
import * as api from "@/api"
import type {
  ChatMessage,
  Conversation,
  Educator,
  Post,
  ProfilePatch,
  Resource,
  SignupInput,
  Toast,
  UploadInput,
} from "@/types"
import { conversationIdFor, uid } from "@/utils"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

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
  ready: boolean
  live: boolean
  login: (email: string, password: string) => Promise<string | null>
  signup: (input: SignupInput) => Promise<string | null>
  logout: () => void
  updateProfile: (patch: ProfilePatch) => void
  uploadResource: (input: UploadInput) => Promise<string | null>
  deleteResource: (id: string) => void
  downloadResource: (id: string) => Promise<Resource | undefined>
  hydrateResource: (id: string) => Promise<Resource | undefined>
  toggleSave: (id: string) => void
  isSaved: (id: string) => boolean
  toggleFollow: (educatorId: string) => void
  isFollowing: (educatorId: string) => boolean
  followsYou: (educatorId: string) => boolean
  followBackSuggestions: Educator[]
  followerCount: (educatorId: string) => number
  followingCount: (educatorId: string) => number
  publishPost: (body: string, resourceId?: string) => Promise<string | null>
  sendMessage: (peerId: string, body: string) => Promise<string | null>
  markConversationRead: (conversationId: string) => void
  conversationWith: (peerId: string) => Conversation | undefined
  messagesFor: (conversationId: string) => ChatMessage[]
  unreadIn: (conversationId: string) => number
  educatorById: (id: string) => Educator | undefined
  authorName: (authorId: string) => string
  notify: (message: string) => void
}

const AppContext = createContext<AppStore | null>(null)

type SnapshotState = {
  educators: Educator[]
  resources: Resource[]
  posts: Post[]
  conversations: Conversation[]
  messages: ChatMessage[]
  savedIds: string[]
  followsByUser: Record<string, string[]>
  currentUser: Educator | null
}

function emptySnapshot(): SnapshotState {
  return {
    educators: [],
    resources: [],
    posts: [],
    conversations: [],
    messages: [],
    savedIds: [],
    followsByUser: {},
    currentUser: null,
  }
}

function applySnapshot(
  snapshot: api.Snapshot,
  current: SnapshotState,
): SnapshotState {
  const files = new Map(
    current.resources.filter((item) => item.fileData).map((item) => [item.id, item.fileData]),
  )
  return {
    educators: snapshot.educators,
    resources: snapshot.resources.map((resource) => ({
      ...resource,
      fileData: resource.fileData ?? files.get(resource.id),
    })),
    posts: snapshot.posts,
    conversations: snapshot.conversations,
    messages: snapshot.messages,
    savedIds: snapshot.savedIds,
    followsByUser: snapshot.followsByUser,
    currentUser: snapshot.currentUser,
  }
}

export default function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnapshotState>(emptySnapshot)
  const [token, setToken] = useState<string | null>(() => api.loadSessionToken())
  const [hasAccounts, setHasAccounts] = useState(false)
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const tokenRef = useRef(token)
  tokenRef.current = token

  const notify = useCallback((message: string) => {
    const id = uid("toast")
    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2800)
  }, [])

  const acceptAuth = useCallback((nextToken: string, snapshot: api.Snapshot) => {
    api.saveSessionToken(nextToken)
    setToken(nextToken)
    setHasAccounts(true)
    setLive(true)
    setState((current) => applySnapshot(snapshot, current))
  }, [])

  const refresh = useCallback(async () => {
    const current = tokenRef.current
    if (!current) return
    try {
      const snapshot = await api.getSnapshot(current)
      setLive(true)
      setState((prev) => applySnapshot(snapshot, prev))
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("sign in")) {
        api.saveSessionToken(null)
        setToken(null)
        setState(emptySnapshot())
      } else {
        setLive(false)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        const health = await api.getHealth()
        if (!cancelled) setHasAccounts(health.hasAccounts)
      } catch {
        if (!cancelled) setLive(false)
      }
      const existing = tokenRef.current
      if (existing) {
        try {
          const snapshot = await api.getSnapshot(existing)
          if (!cancelled) {
            setLive(true)
            setState((prev) => applySnapshot(snapshot, prev))
          }
        } catch {
          api.saveSessionToken(null)
          if (!cancelled) {
            setToken(null)
            setState(emptySnapshot())
          }
        }
      }
      if (!cancelled) setReady(true)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const tick = () => {
      void refresh()
    }
    const id = window.setInterval(tick, 2500)
    const onFocus = () => tick()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") tick()
    })
    return () => {
      window.clearInterval(id)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh, token])

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await api.login(email, password)
        acceptAuth(result.token, result.snapshot)
        notify(`Welcome back, ${result.snapshot.currentUser.name.split(" ")[0]}.`)
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Email or password is incorrect."
      }
    },
    [acceptAuth, notify],
  )

  const signup = useCallback(
    async (input: SignupInput) => {
      try {
        const result = await api.signup(input)
        acceptAuth(result.token, result.snapshot)
        notify(`Welcome to Coursify, ${result.snapshot.currentUser.name.split(" ")[0]}.`)
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Could not create that account."
      }
    },
    [acceptAuth, notify],
  )

  const logout = useCallback(() => {
    const current = tokenRef.current
    if (current) void api.logout(current).catch(() => undefined)
    api.saveSessionToken(null)
    setToken(null)
    setState(emptySnapshot())
  }, [])

  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      const current = tokenRef.current
      if (!current) return
      void api
        .patchProfile(current, patch)
        .then((snapshot) => setState((prev) => applySnapshot(snapshot, prev)))
        .then(() => notify("Profile updated."))
        .catch((error: Error) => notify(error.message))
    },
    [notify],
  )

  const uploadResource = useCallback(
    async (input: UploadInput) => {
      const current = tokenRef.current
      if (!current || !state.currentUser) return "Sign in to upload."
      const issue = uploadIssue({ ...input, sourceUrl: input.sourceUrl ?? "" })
      if (issue) return issue
      if (input.file && input.file.size > MAX_FILE_BYTES) {
        return "Please keep uploads under 4 MB for this workspace."
      }
      const size = input.file?.size ?? 0
      if (state.currentUser.storageBytes + size > STORAGE_CAP_BYTES) {
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
      try {
        const snapshot = await api.createResource(current, {
          title: input.title,
          subject: input.subject,
          grade: input.grade,
          kind: input.kind,
          format: input.format,
          sourceUrl: input.sourceUrl,
          fileName: input.file?.name,
          fileBytes: input.file?.size,
          mimeType: input.file?.type,
          fileData,
        })
        setState((prev) => applySnapshot(snapshot, prev))
        notify(`${input.title} was added to your library.`)
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Could not upload that resource."
      }
    },
    [notify, state.currentUser],
  )

  const deleteResource = useCallback(
    (id: string) => {
      const current = tokenRef.current
      if (!current) return
      void api
        .removeResource(current, id)
        .then((snapshot) => {
          setState((prev) => applySnapshot(snapshot, prev))
          notify("Resource removed from your library.")
        })
        .catch((error: Error) => notify(error.message))
    },
    [notify],
  )

  const hydrateResource = useCallback(async (id: string) => {
    const current = tokenRef.current
    if (!current) return undefined
    try {
      const resource = await api.getResource(current, id)
      setState((prev) => ({
        ...prev,
        resources: prev.resources.map((item) => (item.id === id ? { ...item, ...resource } : item)),
      }))
      return resource
    } catch {
      return undefined
    }
  }, [])

  const downloadResource = useCallback(
    async (id: string) => {
      const current = tokenRef.current
      if (!current) return undefined
      try {
        const resource = await api.downloadResource(current, id)
        setState((prev) => ({
          ...prev,
          resources: prev.resources.map((item) =>
            item.id === id ? { ...item, ...resource, downloads: resource.downloads } : item,
          ),
        }))
        return resource
      } catch {
        return undefined
      }
    },
    [],
  )

  const toggleSave = useCallback((id: string) => {
    const current = tokenRef.current
    if (!current) return
    void api.toggleSave(current, id).then((snapshot) => setState((prev) => applySnapshot(snapshot, prev)))
  }, [])

  const isSaved = useCallback(
    (id: string) => state.savedIds.includes(id),
    [state.savedIds],
  )

  const toggleFollow = useCallback((educatorId: string) => {
    const current = tokenRef.current
    if (!current || educatorId === state.currentUser?.id) return
    void api
      .toggleFollow(current, educatorId)
      .then((snapshot) => setState((prev) => applySnapshot(snapshot, prev)))
  }, [state.currentUser?.id])

  const isFollowing = useCallback(
    (educatorId: string) => {
      if (!state.currentUser) return false
      return (state.followsByUser[state.currentUser.id] ?? []).includes(educatorId)
    },
    [state.currentUser, state.followsByUser],
  )

  const followsYou = useCallback(
    (educatorId: string) => {
      if (!state.currentUser) return false
      return (state.followsByUser[educatorId] ?? []).includes(state.currentUser.id)
    },
    [state.currentUser, state.followsByUser],
  )

  const followBackSuggestions = useMemo(() => {
    if (!state.currentUser) return []
    const myId = state.currentUser.id
    const following = state.followsByUser[myId] ?? []
    return state.educators
      .filter((educator) => educator.id !== myId)
      .filter((educator) => (state.followsByUser[educator.id] ?? []).includes(myId))
      .filter((educator) => !following.includes(educator.id))
  }, [state.currentUser, state.educators, state.followsByUser])

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
    async (body: string, resourceId?: string) => {
      const current = tokenRef.current
      if (!current) return "Sign in to post."
      try {
        const snapshot = await api.createPost(current, body, resourceId)
        setState((prev) => applySnapshot(snapshot, prev))
        notify("Posted to the academic feed.")
        return null
      } catch (error) {
        return error instanceof Error ? error.message : "Could not publish that post."
      }
    },
    [notify],
  )

  const sendMessage = useCallback(async (peerId: string, body: string) => {
    const current = tokenRef.current
    if (!current || !state.currentUser) return "Sign in to send a message."
    const text = body.trim()
    if (!text) return "Write a message first."
    const now = new Date().toISOString()
    const conversationId = conversationIdFor(state.currentUser.id, peerId)
    const optimistic: ChatMessage = {
      id: uid("msg"),
      conversationId,
      senderId: state.currentUser.id,
      body: text,
      createdAt: now,
    }
    setState((prev) => {
      const existing = prev.conversations.find((item) => item.id === conversationId)
      const conversation: Conversation = existing
        ? { ...existing, updatedAt: now, lastReadAt: { ...existing.lastReadAt, [state.currentUser!.id]: now } }
        : {
            id: conversationId,
            participantIds: [state.currentUser!.id, peerId].sort() as [string, string],
            updatedAt: now,
            lastReadAt: { [state.currentUser!.id]: now },
          }
      return {
        ...prev,
        conversations: [conversation, ...prev.conversations.filter((item) => item.id !== conversationId)],
        messages: [...prev.messages, optimistic],
      }
    })
    try {
      const snapshot = await api.sendMessage(current, peerId, text)
      setState((prev) => applySnapshot(snapshot, prev))
      return null
    } catch (error) {
      await refresh()
      return error instanceof Error ? error.message : "Could not send that message."
    }
  }, [refresh, state.currentUser])

  const markConversationRead = useCallback((conversationId: string) => {
    const current = tokenRef.current
    if (!current) return
    void api.markRead(current, conversationId).then((snapshot) => setState((prev) => applySnapshot(snapshot, prev)))
  }, [])

  const conversationWith = useCallback(
    (peerId: string) => {
      if (!state.currentUser) return undefined
      const id = conversationIdFor(state.currentUser.id, peerId)
      return state.conversations.find((item) => item.id === id)
    },
    [state.conversations, state.currentUser],
  )

  const messagesFor = useCallback(
    (conversationId: string) =>
      state.messages.filter((item) => item.conversationId === conversationId),
    [state.messages],
  )

  const unreadIn = useCallback(
    (conversationId: string) => {
      if (!state.currentUser) return 0
      const conversation = state.conversations.find((item) => item.id === conversationId)
      const lastRead = conversation?.lastReadAt[state.currentUser.id] ?? ""
      return state.messages.filter(
        (item) =>
          item.conversationId === conversationId &&
          item.senderId !== state.currentUser!.id &&
          item.createdAt > lastRead,
      ).length
    },
    [state.conversations, state.currentUser, state.messages],
  )

  const myResources = useMemo(() => {
    if (!state.currentUser) return []
    return state.resources.filter((item) => item.authorId === state.currentUser?.id)
  }, [state.currentUser, state.resources])

  const savedResources = useMemo(() => {
    const ids = new Set(state.savedIds)
    return state.resources.filter((item) => ids.has(item.id))
  }, [state.resources, state.savedIds])

  const feedPosts = useMemo(() => {
    if (!state.currentUser) return []
    const following = new Set(state.followsByUser[state.currentUser.id] ?? [])
    return state.posts.filter(
      (post) => post.authorId === state.currentUser?.id || following.has(post.authorId),
    )
  }, [state.currentUser, state.followsByUser, state.posts])

  const unreadCount = useMemo(() => {
    if (!state.currentUser) return 0
    return state.conversations.reduce((sum, conversation) => sum + unreadIn(conversation.id), 0)
  }, [state.conversations, state.currentUser, unreadIn])

  const educatorLookup = useCallback(
    (id: string) => state.educators.find((educator) => educator.id === id),
    [state.educators],
  )

  const authorName = useCallback(
    (authorId: string) => educatorLookup(authorId)?.name ?? "Educator",
    [educatorLookup],
  )

  const value = useMemo<AppStore>(
    () => ({
      educators: state.educators,
      resources: state.resources,
      posts: state.posts,
      conversations: state.conversations,
      messages: state.messages,
      currentUser: state.currentUser,
      hasAccounts,
      myResources,
      savedResources,
      feedPosts,
      unreadCount,
      toasts,
      ready,
      live,
      login,
      signup,
      logout,
      updateProfile,
      uploadResource,
      deleteResource,
      downloadResource,
      hydrateResource,
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
      deleteResource,
      downloadResource,
      educatorLookup,
      feedPosts,
      followBackSuggestions,
      followerCount,
      followingCount,
      followsYou,
      hasAccounts,
      hydrateResource,
      isFollowing,
      isSaved,
      live,
      login,
      logout,
      markConversationRead,
      messagesFor,
      myResources,
      notify,
      publishPost,
      ready,
      savedResources,
      sendMessage,
      signup,
      state.conversations,
      state.currentUser,
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

  if (!ready) {
    return (
      <div className="grid min-h-full place-items-center bg-canvas text-ink">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted">Opening Coursify…</p>
      </div>
    )
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within AppProvider")
  return context
}
