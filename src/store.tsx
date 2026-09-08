import { MAX_FILE_BYTES, STORAGE_CAP_BYTES, normalizeSubject } from "@/data"
import { displayType, uploadIssue } from "@/formats"
import {
  firebaseErrorMessage,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured,
  whenAuthReady,
} from "@/firebase"
import {
  inferInstitutionLevel,
  isFounderEmail,
  isInstitutionLevel,
  professionalEmailError,
  sanitizePlainText,
  normalizeEmail,
} from "@/security"
import type {
  ChatAttachment,
  ChatMessage,
  Conversation,
  Educator,
  Meetup,
  MeetupInput,
  Post,
  ProfilePatch,
  Resource,
  SignupInput,
  Toast,
  UploadInput,
} from "@/types"
import { conversationIdFor, initialsFromName, isHttpUrl, kindLabel, uid } from "@/utils"
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth"
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Query,
} from "firebase/firestore"
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type FollowRow = { id: string; followerId: string; followeeId: string }

type AppStore = {
  educators: Educator[]
  resources: Resource[]
  posts: Post[]
  conversations: Conversation[]
  messages: ChatMessage[]
  events: Meetup[]
  currentUser: Educator | null
  isFounder: boolean
  badgeEligible: boolean
  signedIn: boolean
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
  deleteAccount: (password: string) => Promise<string | null>
  updateProfile: (patch: ProfilePatch) => Promise<string | null>
  claimVerifiedBadge: () => Promise<string | null>
  uploadResource: (input: UploadInput, onProgress?: (progress: number) => void) => Promise<string | null>
  deleteResource: (id: string) => void
  downloadResource: (id: string) => Promise<Resource | undefined>
  hydrateResource: (id: string) => Promise<Resource | undefined>
  toggleSave: (id: string) => Promise<void>
  isSaved: (id: string) => boolean
  toggleFollow: (educatorId: string) => Promise<void>
  isFollowing: (educatorId: string) => boolean
  followsYou: (educatorId: string) => boolean
  followBackSuggestions: Educator[]
  followerCount: (educatorId: string) => number
  followingCount: (educatorId: string) => number
  publishPost: (body: string, resourceId?: string) => Promise<string | null>
  sendMessage: (peerId: string, body: string, attachment?: ChatAttachment) => Promise<string | null>
  uploadChatAttachment: (file: File) => Promise<ChatAttachment>
  markConversationRead: (conversationId: string) => void
  conversationWith: (peerId: string) => Conversation | undefined
  messagesFor: (conversationId: string) => ChatMessage[]
  unreadIn: (conversationId: string) => number
  createMeetup: (input: MeetupInput) => Promise<string | null>
  toggleEventRsvp: (eventId: string) => Promise<void>
  deleteMeetup: (eventId: string) => Promise<void>
  educatorById: (id: string) => Educator | undefined
  authorName: (authorId: string) => string
  notify: (message: string) => void
}

const AppContext = createContext<AppStore | null>(null)

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T
}

function toEducator(id: string, data: Record<string, unknown>): Educator {
  return {
    id,
    email: String(data.email ?? ""),
    name: String(data.name ?? "Educator"),
    initials: String(data.initials ?? initialsFromName(String(data.name ?? "E"))),
    school: String(data.school ?? ""),
    subject: normalizeSubject(String(data.subject ?? "Mathematics")),
    bio: String(data.bio ?? ""),
    joinedYear: Number(data.joinedYear) || new Date().getFullYear(),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    storageBytes: Number(data.storageBytes) || 0,
    verified: isFounderEmail(String(data.email ?? "")) || data.badgeClaimed === true,
    badgeClaimed: data.badgeClaimed === true,
    institutionLevel: isInstitutionLevel(data.institutionLevel) ? data.institutionLevel : "high-school",
    photoData: typeof data.photoData === "string" ? data.photoData : undefined,
  }
}

function toResource(id: string, data: Record<string, unknown>): Resource {
  return {
    id,
    title: String(data.title ?? "Resource"),
    authorId: String(data.authorId ?? ""),
    subject: normalizeSubject(String(data.subject ?? "Mathematics")),
    grade: String(data.grade ?? ""),
    type: String(data.type ?? "Resource"),
    kind:
      data.kind === "lesson-plan" || data.kind === "collection" ? data.kind : "resource",
    format:
      data.format === "video" ||
      data.format === "slides" ||
      data.format === "spreadsheet" ||
      data.format === "code"
        ? data.format
        : "document",
    mimeType: typeof data.mimeType === "string" ? data.mimeType : undefined,
    downloads: Number(data.downloads) || 0,
    saves: Number(data.saves) || 0,
    fileName: typeof data.fileName === "string" ? data.fileName : undefined,
    fileSize: typeof data.fileSize === "string" ? data.fileSize : undefined,
    fileBytes: typeof data.fileBytes === "number" ? data.fileBytes : undefined,
    fileUrl: typeof data.fileUrl === "string" ? data.fileUrl : undefined,
    storagePath: typeof data.storagePath === "string" ? data.storagePath : undefined,
    sourceUrl: typeof data.sourceUrl === "string" ? data.sourceUrl : undefined,
    createdAt: String(data.createdAt ?? new Date().toISOString().slice(0, 10)),
    hasFile: Boolean(data.fileUrl || data.storagePath),
  }
}

function toPost(id: string, data: Record<string, unknown>): Post {
  const post: Post = {
    id,
    authorId: String(data.authorId ?? ""),
    body: String(data.body ?? ""),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
  }
  if (data.resourceId) post.resourceId = String(data.resourceId)
  return post
}

function toConversation(id: string, data: Record<string, unknown>): Conversation | null {
  const ids = Array.isArray(data.participantIds) ? data.participantIds.map(String) : []
  if (ids.length !== 2) return null
  const lastReadAt = asRecord(data.lastReadAt)
  return {
    id,
    participantIds: [...ids].sort() as [string, string],
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
    lastReadAt: Object.fromEntries(Object.entries(lastReadAt).map(([key, value]) => [key, String(value)])),
  }
}

function toMessage(id: string, data: Record<string, unknown>): ChatMessage | null {
  const body = String(data.body ?? "").trim()
  if (!body && !data.attachmentUrl) return null
  if (!data.senderId || !data.conversationId) return null
  return {
    id,
    conversationId: String(data.conversationId),
    senderId: String(data.senderId),
    body: body || (typeof data.attachmentName === "string" ? `Shared ${data.attachmentName}` : "Shared an attachment"),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    attachmentUrl: typeof data.attachmentUrl === "string" ? data.attachmentUrl : undefined,
    attachmentName: typeof data.attachmentName === "string" ? data.attachmentName : undefined,
    attachmentType: typeof data.attachmentType === "string" ? data.attachmentType : undefined,
    attachmentSize: typeof data.attachmentSize === "string" ? data.attachmentSize : undefined,
    status: (data.status as "sent" | "delivered" | "read") || "delivered",
  }
}

function toMeetup(id: string, data: Record<string, unknown>): Meetup | null {
  const title = String(data.title ?? "").trim()
  const hostId = String(data.hostId ?? "")
  const startsAt = String(data.startsAt ?? "")
  if (!title || !hostId || !startsAt) return null
  const rsvpIds = Array.isArray(data.rsvpIds) ? data.rsvpIds.map(String) : []
  const meetup: Meetup = {
    id,
    title,
    description: String(data.description ?? ""),
    hostId,
    format: data.format === "online" ? "online" : "in-person",
    startsAt,
    rsvpIds,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
  }
  if (typeof data.location === "string" && data.location.trim()) meetup.location = data.location.trim()
  if (typeof data.meetingUrl === "string" && data.meetingUrl.trim()) meetup.meetingUrl = data.meetingUrl.trim()
  return meetup
}

function educatorStub(user: User, extras?: Partial<Educator>): Educator {
  const email = normalizeEmail(user.email ?? extras?.email ?? "")
  const name = extras?.name || email.split("@")[0] || "Educator"
  return {
    id: user.uid,
    email,
    name,
    initials: initialsFromName(name),
    school: extras?.school ?? "",
    subject: extras?.subject ?? "Mathematics",
    bio: extras?.bio ?? "",
    joinedYear: extras?.joinedYear ?? new Date().getFullYear(),
    createdAt: extras?.createdAt ?? new Date().toISOString(),
    storageBytes: extras?.storageBytes ?? 0,
    verified: isFounderEmail(email) || extras?.badgeClaimed === true,
    badgeClaimed: isFounderEmail(email) || extras?.badgeClaimed === true,
    institutionLevel:
      extras?.institutionLevel ?? inferInstitutionLevel(email, extras?.school ?? ""),
    photoData: extras?.photoData,
  }
}

function persistablePhoto(photo: string | null | undefined) {
  if (!photo) return undefined
  if (/^https?:\/\//i.test(photo)) return photo
  if (photo.startsWith("data:image/") && photo.length <= 700_000) return photo
  return undefined
}

function educatorPayload(profile: Educator) {
  const photoData = persistablePhoto(profile.photoData)
  return compact({
    email: profile.email,
    name: profile.name,
    initials: profile.initials,
    school: profile.school,
    subject: profile.subject,
    bio: profile.bio,
    joinedYear: profile.joinedYear,
    storageBytes: profile.storageBytes,
    verified: isFounderEmail(profile.email) || profile.badgeClaimed === true || profile.verified === true,
    badgeClaimed: isFounderEmail(profile.email) || profile.badgeClaimed === true,
    institutionLevel: profile.institutionLevel,
    photoData,
    createdAt: new Date().toISOString(),
  })
}

function profileCacheKey(uid: string) {
  return `coursify.educator.${uid}`
}

function readCachedProfile(uid: string): Educator | null {
  try {
    const raw = localStorage.getItem(profileCacheKey(uid))
    if (!raw) return null
    return toEducator(uid, asRecord(JSON.parse(raw)))
  } catch {
    return null
  }
}

function writeCachedProfile(profile: Educator) {
  try {
    localStorage.setItem(profileCacheKey(profile.id), JSON.stringify(profile))
  } catch {
    /* quota */
  }
}

function clearCachedProfile(uid: string) {
  try {
    localStorage.removeItem(profileCacheKey(uid))
  } catch {
    /* ignore */
  }
}

function mergeEducator(base: Educator | undefined, next: Educator): Educator {
  if (!base || base.id !== next.id) return next
  return {
    ...base,
    ...next,
    name: next.name && next.name !== "Educator" ? next.name : base.name,
    initials: next.initials && next.initials !== "E" ? next.initials : base.initials,
    school: next.school.trim() ? next.school : base.school,
    bio: next.bio.trim() ? next.bio : base.bio,
    photoData: next.photoData || base.photoData,
    storageBytes: next.storageBytes || base.storageBytes,
  }
}

const profileLoads = new Map<string, Promise<Educator | null>>()

async function fetchEducator(user: User): Promise<Educator | null> {
  const pending = profileLoads.get(user.uid)
  if (pending) return pending

  const task = (async () => {
    const ref = doc(getFirebaseDb(), "educators", user.uid)
    await withTimeout(user.getIdToken(), 8_000, "Could not verify your session. Please try again.")
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const snap = await withTimeout(getDoc(ref), 8_000, "Could not load your profile. Please try again.")
        if (snap.exists()) return toEducator(snap.id, asRecord(snap.data()))
        return null
      } catch {
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)))
      }
    }
    return null
  })()

  profileLoads.set(user.uid, task)
  try {
    return await task
  } finally {
    profileLoads.delete(user.uid)
  }
}

async function fileToDataUrl(fileUrl: string) {
  const response = await withTimeout(fetch(fileUrl), 10_000, "Could not load that file. Please try again.")
  const blob = await withTimeout(response.blob(), 10_000, "Could not read that file.")
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read that file."))
    reader.readAsDataURL(blob)
  })
}

const REQUEST_MS = 12_000
const REQUEST_TIMEOUT = "That request timed out. Check your connection and try again."

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function timedWrite<T>(promise: Promise<T>, message = REQUEST_TIMEOUT) {
  return withTimeout(promise, REQUEST_MS, message)
}

async function deleteQueryDocs(target: Query) {
  const snap = await withTimeout(getDocs(target), 8_000, REQUEST_TIMEOUT)
  for (let index = 0; index < snap.docs.length; index += 20) {
    const chunk = snap.docs.slice(index, index + 20)
    await Promise.all(chunk.map((item) => timedWrite(deleteDoc(item.ref))))
  }
}

async function deleteStorageFolder(path: string) {
  try {
    const folder = storageRef(getFirebaseStorage(), path)
    const listed = await withTimeout(listAll(folder), 2_000, "storage-list-timeout")
    await Promise.all(listed.items.map((item) => deleteObject(item).catch(() => undefined)))
  } catch {
    /* Storage may be unavailable; account deletion still continues. */
  }
}

export default function AppProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [educators, setEducators] = useState<Educator[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [events, setEvents] = useState<Meetup[]>([])
  const [follows, setFollows] = useState<FollowRow[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [hasAccounts, setHasAccounts] = useState(false)
  const [ready, setReady] = useState(false)
  const [live, setLive] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [hydratedFiles, setHydratedFiles] = useState<Record<string, string>>({})
  const [sessionProfile, setSessionProfile] = useState<Educator | null>(null)

  const notify = useCallback((message: string) => {
    const id = uid("toast")
    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2800)
  }, [])

  const currentUser = useMemo(() => {
    if (!authUser) return null
    return educators.find((educator) => educator.id === authUser.uid) ?? sessionProfile
  }, [authUser, educators, sessionProfile])
  const signedIn = Boolean(authUser)
  const isFounder = isFounderEmail(currentUser?.email ?? authUser?.email ?? "")
  const badgeEligible = Boolean(
    currentUser &&
      !currentUser.verified &&
      currentUser.bio.trim() &&
      currentUser.school.trim() &&
      currentUser.subject.trim() &&
      resources.filter((resource) => resource.authorId === currentUser.id).length >= 3,
  )

  function rememberProfile(profile: Educator) {
    setSessionProfile((current) => mergeEducator(current ?? undefined, profile))
    setEducators((current) => {
      const merged = mergeEducator(current.find((item) => item.id === profile.id), profile)
      writeCachedProfile(merged)
      return [...current.filter((item) => item.id !== merged.id), merged]
    })
  }

  const followsByUser = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const row of follows) {
      map[row.followerId] = [...(map[row.followerId] ?? []), row.followeeId]
    }
    return map
  }, [follows])

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true)
      setLive(false)
      return
    }

    let unsubAuth: () => void = () => {}
    let unsubStats: () => void = () => {}
    let cancelled = false

    void whenAuthReady().then(() => {
      if (cancelled) return
      const auth = getFirebaseAuth()
      const db = getFirebaseDb()
      unsubAuth = onAuthStateChanged(auth, (user) => {
        setAuthUser(user)
        setReady(true)
        if (!user) {
          setSessionProfile(null)
          setLive(false)
          return
        }
        setLive(true)
        const cached = readCachedProfile(user.uid)
        if (cached) rememberProfile(cached)
        void fetchEducator(user)
          .then((profile) => {
            if (profile) {
              rememberProfile(profile)
              setLive(true)
              return
            }
            if (!readCachedProfile(user.uid)) rememberProfile(educatorStub(user))
          })
          .catch((error) => {
            if (!readCachedProfile(user.uid)) rememberProfile(educatorStub(user))
            setLive(true)
            notify(firebaseErrorMessage(error))
          })
      })
      unsubStats = onSnapshot(doc(db, "meta", "stats"), (snap) => {
        setHasAccounts(Boolean(snap.data()?.hasAccounts) || (snap.data()?.users ?? 0) > 0)
      })
    })

    return () => {
      cancelled = true
      unsubAuth()
      unsubStats()
    }
  }, [notify])

  useEffect(() => {
    if (!authUser?.uid || !isFirebaseConfigured()) {
      setEducators([])
      setResources([])
      setPosts([])
      setConversations([])
      setMessages([])
      setEvents([])
      setFollows([])
      setSavedIds([])
      return
    }

    const db = getFirebaseDb()
    const uid = authUser.uid
    const onListenError = () => setLive(false)
    const stops = [
      onSnapshot(
        doc(db, "educators", uid),
        (snap) => {
          if (!snap.exists()) return
          rememberProfile(toEducator(snap.id, asRecord(snap.data())))
          setLive(true)
        },
        onListenError,
      ),
      onSnapshot(
        collection(db, "educators"),
        (snap) => {
          const incoming = snap.docs.map((item) => toEducator(item.id, asRecord(item.data())))
          setEducators((current) => {
            const mineIncoming = incoming.find((item) => item.id === uid)
            const mineCurrent = current.find((item) => item.id === uid)
            const mine = mineIncoming ? mergeEducator(mineCurrent, mineIncoming) : mineCurrent
            if (mine) writeCachedProfile(mine)
            const rest = incoming.filter((item) => item.id !== uid)
            if (mine) return [...rest, mine]
            return rest.length > 0 ? rest : current
          })
          setLive(true)
        },
        onListenError,
      ),
      onSnapshot(
        collection(db, "resources"),
        (snap) => {
          setResources(snap.docs.map((item) => toResource(item.id, asRecord(item.data()))))
        },
        onListenError,
      ),
      onSnapshot(
        collection(db, "posts"),
        (snap) => {
          setPosts(
            snap.docs
              .map((item) => toPost(item.id, asRecord(item.data())))
              .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
          )
        },
        onListenError,
      ),
      onSnapshot(
        collection(db, "follows"),
        (snap) => {
          setFollows(
            snap.docs.map((item) => {
              const data = asRecord(item.data())
              return {
                id: item.id,
                followerId: String(data.followerId ?? ""),
                followeeId: String(data.followeeId ?? ""),
              }
            }),
          )
        },
        onListenError,
      ),
      onSnapshot(
        query(collection(db, "saves"), where("userId", "==", authUser.uid)),
        (snap) => {
          setSavedIds(snap.docs.map((item) => String(asRecord(item.data()).resourceId ?? "")))
        },
        onListenError,
      ),
      onSnapshot(
        query(collection(db, "conversations"), where("participantIds", "array-contains", authUser.uid)),
        (snap) => {
          setConversations(
            snap.docs
              .map((item) => toConversation(item.id, asRecord(item.data())))
              .filter((item): item is Conversation => item !== null),
          )
        },
        onListenError,
      ),
      onSnapshot(
        query(collection(db, "messages"), where("participantIds", "array-contains", authUser.uid)),
        (snap) => {
          setMessages(
            snap.docs
              .map((item) => toMessage(item.id, asRecord(item.data())))
              .filter((item): item is ChatMessage => item !== null)
              .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
          )
        },
        onListenError,
      ),
      onSnapshot(
        collection(db, "events"),
        (snap) => {
          setEvents(
            snap.docs
              .map((item) => toMeetup(item.id, asRecord(item.data())))
              .filter((item): item is Meetup => item !== null)
              .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1)),
          )
        },
        onListenError,
      ),
    ]

    return () => stops.forEach((stop) => stop())
  }, [authUser?.uid])

  const login = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      return "Coursify is not connected to Firebase yet. Add the VITE_FIREBASE_ keys and rebuild."
    }
    const normalized = normalizeEmail(email)
    if (!normalized || !password) return "Enter your email and password."
    let user: User
    try {
      const cred = await withTimeout(
        signInWithEmailAndPassword(getFirebaseAuth(), normalized, password),
        REQUEST_MS,
        "Sign-in timed out. Check your connection and try again.",
      )
      user = cred.user
    } catch (error) {
      return firebaseErrorMessage(error, "login")
    }
    setAuthUser(user)
    setReady(true)
    setLive(true)
    try {
      await withTimeout(user.getIdToken(), 8_000, "Could not verify your session. Please try again.")
      const cached = readCachedProfile(user.uid)
      if (cached) rememberProfile(cached)
      const profile = await fetchEducator(user)
      if (profile) rememberProfile(profile)
      else if (!cached) rememberProfile(educatorStub(user))
    } catch (error) {
      const cached = readCachedProfile(user.uid)
      rememberProfile(cached ?? educatorStub(user))
      notify(firebaseErrorMessage(error))
    }
    return null
  }, [notify])

  const signup = useCallback(async (input: SignupInput) => {
    const email = normalizeEmail(input.email)
    const name = sanitizePlainText(input.name, 80)
    const school = sanitizePlainText(input.school ?? "", 120)
    const bio = sanitizePlainText(input.bio ?? "", 800)
    const emailError = professionalEmailError(email)
    if (!name) return "Please enter your full name."
    if (emailError) return emailError
    if (input.password.length < 8) return "Password must be at least 8 characters."
    if (!isFirebaseConfigured()) {
      return "Coursify is not connected to Firebase yet. Add the VITE_FIREBASE_ keys and rebuild."
    }
    let user: User
    try {
      const cred = await withTimeout(
        createUserWithEmailAndPassword(getFirebaseAuth(), email, input.password),
        REQUEST_MS,
        "Account creation timed out. Check your connection and try again.",
      )
      user = cred.user
    } catch (error) {
      return firebaseErrorMessage(error)
    }
    const educator = compact({
      email,
      name,
      initials: initialsFromName(name),
      school,
      subject: input.subject ?? "Mathematics",
      bio,
      joinedYear: new Date().getFullYear(),
      storageBytes: 0,
      verified: isFounderEmail(email),
      badgeClaimed: isFounderEmail(email),
      institutionLevel: isInstitutionLevel(input.institutionLevel)
        ? input.institutionLevel
        : inferInstitutionLevel(email, school),
      createdAt: new Date().toISOString(),
    })
    setAuthUser(user)
    rememberProfile(toEducator(user.uid, asRecord(educator)))
    setReady(true)
    setLive(true)
    try {
      await withTimeout(user.getIdToken(), 8_000, "Could not verify your session. Please try again.")
      await timedWrite(setDoc(doc(getFirebaseDb(), "educators", user.uid), educator))
      await timedWrite(
        setDoc(doc(getFirebaseDb(), "meta", "stats"), { hasAccounts: true, users: increment(1) }, { merge: true }),
      )
    } catch (error) {
      notify(firebaseErrorMessage(error))
    }
    return null
  }, [notify])

  const logout = useCallback(() => {
    void (async () => {
      try {
        await withTimeout(signOut(getFirebaseAuth()), 8_000, "Could not sign out. Please try again.")
      } catch {
        setAuthUser(null)
        setSessionProfile(null)
        setLive(false)
      }
    })()
  }, [])

  const deleteAccount = useCallback(async (password: string) => {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user?.email) return "Sign in to delete your account."
    if (!password.trim()) return "Enter your password to confirm account deletion."

    try {
      await withTimeout(
        reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)),
        8_000,
        "Could not confirm your password. Check it and try again.",
      )
    } catch (error) {
      return firebaseErrorMessage(error)
    }

    const active = auth.currentUser
    if (!active) return "Sign in to delete your account."
    const uid = active.uid
    const db = getFirebaseDb()

    try {
      await withTimeout(
        (async () => {
          await Promise.allSettled([
            deleteQueryDocs(query(collection(db, "resources"), where("authorId", "==", uid))),
            deleteQueryDocs(query(collection(db, "posts"), where("authorId", "==", uid))),
            deleteQueryDocs(query(collection(db, "saves"), where("userId", "==", uid))),
            deleteQueryDocs(query(collection(db, "follows"), where("followerId", "==", uid))),
            deleteQueryDocs(query(collection(db, "follows"), where("followeeId", "==", uid))),
            deleteQueryDocs(query(collection(db, "events"), where("hostId", "==", uid))),
            deleteQueryDocs(query(collection(db, "conversations"), where("participantIds", "array-contains", uid))),
            deleteQueryDocs(query(collection(db, "messages"), where("participantIds", "array-contains", uid))),
            deleteStorageFolder(`avatars/${uid}`),
            deleteStorageFolder(`resources/${uid}`),
          ])
          await timedWrite(deleteDoc(doc(db, "educators", uid)))
          await withTimeout(deleteUser(active), 12_000, "Could not delete your login. Please try again.")
        })(),
        20_000,
        "Account deletion timed out. Please try again.",
      )
    } catch (error) {
      return firebaseErrorMessage(error)
    }

    clearCachedProfile(uid)
    setSessionProfile(null)
    setAuthUser(null)
    return null
  }, [])

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!authUser) return "Sign in to update your profile."
      const name =
        sanitizePlainText(patch.name ?? currentUser?.name ?? "", 80) || currentUser?.name || "Educator"
      const school = sanitizePlainText(patch.school ?? currentUser?.school ?? "", 120)
      const bio = sanitizePlainText(patch.bio ?? currentUser?.bio ?? "", 800)
      const subject = patch.subject ?? currentUser?.subject ?? "Mathematics"
      const institutionLevel = isInstitutionLevel(patch.institutionLevel)
        ? patch.institutionLevel
        : (currentUser?.institutionLevel ?? "high-school")
      const initials = initialsFromName(name)
      let photoData: string | null | undefined =
        patch.photoData === undefined ? currentUser?.photoData : patch.photoData

      rememberProfile({
        ...(currentUser ?? educatorStub(authUser, { name, school, subject, bio, institutionLevel })),
        name,
        initials,
        school,
        subject,
        bio,
        institutionLevel,
        photoData: typeof photoData === "string" && photoData ? photoData : undefined,
      })

      const uid = authUser.uid
      const photo = persistablePhoto(typeof photoData === "string" ? photoData : undefined)
      try {
        await timedWrite(
          setDoc(
            doc(getFirebaseDb(), "educators", uid),
            {
              name,
              initials,
              school,
              subject,
              bio,
              institutionLevel,
              updatedAt: new Date().toISOString(),
              photoData: photo ? photo : deleteField(),
            },
            { merge: true },
          ),
          "Saving your profile timed out. Please try again.",
        )
        notify("Profile updated.")
        return null
      } catch (error) {
        const message = firebaseErrorMessage(error)
        notify(message)
        return message
      }
    },
    [authUser, currentUser, notify],
  )

  const claimVerifiedBadge = useCallback(async () => {
    if (!authUser || !currentUser) return "Sign in to claim a badge."
    const eligible =
      isFounderEmail(currentUser.email) ||
      (Boolean(currentUser.bio.trim()) &&
        Boolean(currentUser.school.trim()) &&
        Boolean(currentUser.subject.trim()) &&
        resources.filter((resource) => resource.authorId === currentUser.id).length >= 3)
    if (!eligible) return "Complete your profile and share three resources before claiming this badge."
    try {
      await timedWrite(
        updateDoc(doc(getFirebaseDb(), "educators", authUser.uid), {
          verified: true,
          badgeClaimed: true,
          badgeClaimedAt: new Date().toISOString(),
        }),
        "Could not claim your badge. Please try again.",
      )
      rememberProfile({
        ...currentUser,
        verified: true,
        badgeClaimed: true,
      })
      notify("Verified Educator badge claimed — congratulations!")
      return null
    } catch (error) {
      return firebaseErrorMessage(error)
    }
  }, [authUser, currentUser, notify, resources])

  const uploadResource = useCallback(
    async (input: UploadInput, onProgress?: (progress: number) => void) => {
      if (!authUser || !currentUser) return "Sign in to upload."
      const title = sanitizePlainText(input.title, 160)
      if (!title) return "Give the resource a title."
      const issue = uploadIssue({ ...input, sourceUrl: input.sourceUrl ?? "" })
      if (issue) return issue
      if (input.file && input.file.size > MAX_FILE_BYTES) {
        return `Please keep uploads at or below ${Math.round(MAX_FILE_BYTES / 1_048_576)} MB.`
      }
      const size = input.file?.size ?? 0
      if (currentUser.storageBytes + size > STORAGE_CAP_BYTES) {
        return "Not enough storage for this file."
      }
      let storagePath: string | undefined
      try {
        const resourceId = uid("res")
        let fileUrl: string | undefined
        if (input.file) {
          const fileName = input.file.name.replace(/[\\/#?\[\]]/g, "_")
          storagePath = `resources/${authUser.uid}/${resourceId}/${fileName}`
          const fileRef = storageRef(getFirebaseStorage(), storagePath)
          const task = uploadBytesResumable(fileRef, input.file, {
            contentType: input.file.type || "application/octet-stream",
          })
          task.on("state_changed", (snapshot) => {
            const total = snapshot.totalBytes || input.file?.size || 1
            onProgress?.(Math.round((snapshot.bytesTransferred / total) * 100))
          })
          await task
          fileUrl = await withTimeout(
            getDownloadURL(fileRef),
            45_000,
            "Could not finish saving that file. Please try again.",
          )
        }
        const resource = compact({
          title,
          authorId: authUser.uid,
          subject: input.subject,
          grade: input.grade,
          kind: input.kind,
          format: input.format,
          mimeType: input.file?.type || undefined,
          type: displayType(kindLabel(input.kind), { format: input.format, fileName: input.file?.name, sourceUrl: input.sourceUrl }),
          downloads: 0,
          saves: 0,
          fileName: input.file?.name ? sanitizePlainText(input.file.name, 120) : undefined,
          fileSize: input.file ? `${(input.file.size / 1_000_000).toFixed(1)} MB` : undefined,
          fileBytes: size || undefined,
          fileUrl,
          storagePath,
          sourceUrl: sanitizePlainText(input.sourceUrl ?? "", 500) || undefined,
          createdAt: new Date().toISOString().slice(0, 10),
        })
        await timedWrite(setDoc(doc(getFirebaseDb(), "resources", resourceId), resource))
        await timedWrite(
          addDoc(collection(getFirebaseDb(), "posts"), {
            authorId: authUser.uid,
            body: `Shared ${title} with the library.`,
            resourceId,
            createdAt: new Date().toISOString(),
          }),
        )
        if (size) {
          await timedWrite(
            updateDoc(doc(getFirebaseDb(), "educators", authUser.uid), {
              storageBytes: increment(size),
            }),
          )
        }
        notify(`${title} was added to your library.`)
        return null
      } catch (error) {
        if (storagePath) {
          await deleteObject(storageRef(getFirebaseStorage(), storagePath)).catch(() => undefined)
        }
        return firebaseErrorMessage(error)
      }
    },
    [authUser, currentUser, notify],
  )

  const deleteResource = useCallback(
    (id: string) => {
      if (!authUser) return
      const resource = resources.find((item) => item.id === id)
      if (!resource || resource.authorId !== authUser.uid) return
      void (async () => {
        try {
          if (resource.storagePath) {
            await deleteObject(storageRef(getFirebaseStorage(), resource.storagePath)).catch(() => undefined)
          }
          await deleteDoc(doc(getFirebaseDb(), "resources", id))
          if (resource.fileBytes) {
            await updateDoc(doc(getFirebaseDb(), "educators", authUser.uid), {
              storageBytes: increment(-resource.fileBytes),
            })
          }
          notify("Resource removed from your library.")
        } catch (error) {
          notify(firebaseErrorMessage(error))
        }
      })()
    },
    [authUser, notify, resources],
  )

  const hydrateResource = useCallback(
    async (id: string) => {
      const resource = resources.find((item) => item.id === id)
      if (!resource) return undefined
      if (resource.fileData || hydratedFiles[id]) {
        return { ...resource, fileData: resource.fileData ?? hydratedFiles[id] }
      }
      if (!resource.fileUrl) return resource
      try {
        const fileData = await fileToDataUrl(resource.fileUrl)
        setHydratedFiles((current) => ({ ...current, [id]: fileData }))
        return { ...resource, fileData, hasFile: true }
      } catch {
        return resource
      }
    },
    [hydratedFiles, resources],
  )

  const downloadResource = useCallback(
    async (id: string) => {
      const resource = await hydrateResource(id)
      if (!resource) return undefined
      try {
        await timedWrite(updateDoc(doc(getFirebaseDb(), "resources", id), { downloads: increment(1) }))
      } catch {
        /* still allow the download */
      }
      return { ...resource, downloads: resource.downloads + 1 }
    },
    [hydrateResource],
  )

  const toggleSave = useCallback(
    async (id: string) => {
      if (!authUser) return
      const saveId = `${authUser.uid}_${id}`
      const saved = savedIds.includes(id)
      try {
        if (saved) await timedWrite(deleteDoc(doc(getFirebaseDb(), "saves", saveId)))
        else await timedWrite(setDoc(doc(getFirebaseDb(), "saves", saveId), { userId: authUser.uid, resourceId: id }))
        await timedWrite(updateDoc(doc(getFirebaseDb(), "resources", id), { saves: increment(saved ? -1 : 1) }))
      } catch (error) {
        throw new Error(firebaseErrorMessage(error))
      }
    },
    [authUser, savedIds],
  )

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds])

  const toggleFollow = useCallback(
    async (educatorId: string) => {
      if (!authUser || educatorId === authUser.uid) return
      const followId = `${authUser.uid}_${educatorId}`
      const following = (followsByUser[authUser.uid] ?? []).includes(educatorId)
      try {
        if (following) await timedWrite(deleteDoc(doc(getFirebaseDb(), "follows", followId)))
        else {
          await timedWrite(
            setDoc(doc(getFirebaseDb(), "follows", followId), {
              followerId: authUser.uid,
              followeeId: educatorId,
              createdAt: new Date().toISOString(),
            }),
          )
        }
      } catch (error) {
        throw new Error(firebaseErrorMessage(error))
      }
    },
    [authUser, followsByUser],
  )

  const isFollowing = useCallback(
    (educatorId: string) => {
      if (!authUser) return false
      return (followsByUser[authUser.uid] ?? []).includes(educatorId)
    },
    [authUser, followsByUser],
  )

  const followsYou = useCallback(
    (educatorId: string) => {
      if (!authUser) return false
      return (followsByUser[educatorId] ?? []).includes(authUser.uid)
    },
    [authUser, followsByUser],
  )

  const followBackSuggestions = useMemo(() => {
    if (!authUser) return []
    const following = followsByUser[authUser.uid] ?? []
    return educators
      .filter((educator) => educator.id !== authUser.uid)
      .filter((educator) => (followsByUser[educator.id] ?? []).includes(authUser.uid))
      .filter((educator) => !following.includes(educator.id))
  }, [authUser, educators, followsByUser])

  const followerCount = useCallback(
    (educatorId: string) => follows.filter((row) => row.followeeId === educatorId).length,
    [follows],
  )

  const followingCount = useCallback(
    (educatorId: string) => (followsByUser[educatorId] ?? []).length,
    [followsByUser],
  )

  const publishPost = useCallback(
    async (body: string, resourceId?: string) => {
      if (!authUser) return "Sign in to post."
      const text = sanitizePlainText(body, 800)
      if (!text && !resourceId) return "Write a short update before posting."
      try {
        await timedWrite(
          addDoc(
            collection(getFirebaseDb(), "posts"),
            compact({
              authorId: authUser.uid,
              body: text || "Shared a resource with colleagues.",
              resourceId,
              createdAt: new Date().toISOString(),
            }),
          ),
        )
        notify("Posted to the academic feed.")
        return null
      } catch (error) {
        return firebaseErrorMessage(error)
      }
    },
    [authUser, notify],
  )

  const uploadChatAttachment = useCallback(
    async (file: File): Promise<ChatAttachment> => {
      if (!authUser) throw new Error("Sign in to send attachments.")
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("Chat attachments must be 25MB or less.")
      }
      const fileId = uid("att")
      const safeName = file.name.replace(/[\\/#?\[\]]/g, "_")
      const storagePath = `resources/${authUser.uid}/chat/${fileId}_${safeName}`
      const fileRef = storageRef(getFirebaseStorage(), storagePath)
      await uploadBytesResumable(fileRef, file, {
        contentType: file.type || "application/octet-stream",
      })
      const url = await withTimeout(
        getDownloadURL(fileRef),
        30_000,
        "Attachment upload timed out. Please try again.",
      )
      return {
        url,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: `${(file.size / 1_048_576).toFixed(1)} MB`,
      }
    },
    [authUser],
  )

  const sendMessage = useCallback(
    async (peerId: string, body: string, attachment?: ChatAttachment) => {
      if (!authUser) return "Sign in to send a message."
      if (peerId === authUser.uid) return "You cannot message yourself."
      const text = sanitizePlainText(body, 2000)
      if (!text && !attachment) return "Write a message or attach a file first."
      const now = new Date().toISOString()
      const conversationId = conversationIdFor(authUser.uid, peerId)
      const participantIds = [authUser.uid, peerId].sort()
      const previewText = text || (attachment ? `Shared ${attachment.name}` : "Shared an attachment")
      try {
        await timedWrite(
          setDoc(
            doc(getFirebaseDb(), "conversations", conversationId),
            {
              participantIds,
              updatedAt: now,
              lastMessage: previewText,
            },
            { merge: true },
          ),
        )
        await timedWrite(
          updateDoc(doc(getFirebaseDb(), "conversations", conversationId), {
            [`lastReadAt.${authUser.uid}`]: now,
          }),
        )
        await timedWrite(
          addDoc(
            collection(getFirebaseDb(), "messages"),
            compact({
              conversationId,
              senderId: authUser.uid,
              body: text || (attachment ? `Shared ${attachment.name}` : ""),
              createdAt: now,
              participantIds,
              attachmentUrl: attachment?.url,
              attachmentName: attachment?.name,
              attachmentType: attachment?.type,
              attachmentSize: attachment?.size,
              status: "delivered",
            }),
          ),
        )
        return null
      } catch (error) {
        return firebaseErrorMessage(error)
      }
    },
    [authUser],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!authUser) return
      void updateDoc(doc(getFirebaseDb(), "conversations", conversationId), {
        [`lastReadAt.${authUser.uid}`]: new Date().toISOString(),
      }).catch(() => undefined)
    },
    [authUser],
  )

  const conversationWith = useCallback(
    (peerId: string) => {
      if (!authUser) return undefined
      const id = conversationIdFor(authUser.uid, peerId)
      return conversations.find((item) => item.id === id)
    },
    [authUser, conversations],
  )

  const messagesFor = useCallback(
    (conversationId: string) => messages.filter((item) => item.conversationId === conversationId),
    [messages],
  )

  const unreadIn = useCallback(
    (conversationId: string) => {
      if (!authUser) return 0
      const conversation = conversations.find((item) => item.id === conversationId)
      const lastRead = conversation?.lastReadAt[authUser.uid] ?? ""
      return messages.filter(
        (item) =>
          item.conversationId === conversationId &&
          item.senderId !== authUser.uid &&
          item.createdAt > lastRead,
      ).length
    },
    [authUser, conversations, messages],
  )

  const resourcesWithFiles = useMemo(
    () =>
      resources.map((resource) =>
        hydratedFiles[resource.id] ? { ...resource, fileData: hydratedFiles[resource.id], hasFile: true } : resource,
      ),
    [hydratedFiles, resources],
  )

  const myResources = useMemo(() => {
    if (!authUser) return []
    return resourcesWithFiles.filter((item) => item.authorId === authUser.uid)
  }, [authUser, resourcesWithFiles])

  const savedResources = useMemo(() => {
    const ids = new Set(savedIds)
    return resourcesWithFiles.filter((item) => ids.has(item.id))
  }, [resourcesWithFiles, savedIds])

  const feedPosts = useMemo(() => {
    if (!authUser) return []
    const following = new Set(followsByUser[authUser.uid] ?? [])
    return posts.filter((post) => post.authorId === authUser.uid || following.has(post.authorId))
  }, [authUser, followsByUser, posts])

  const unreadCount = useMemo(() => {
    if (!authUser) return 0
    return conversations.reduce((sum, conversation) => sum + unreadIn(conversation.id), 0)
  }, [authUser, conversations, unreadIn])

  const createMeetup = useCallback(
    async (input: MeetupInput) => {
      if (!authUser) return "Sign in to host a meetup."
      const title = sanitizePlainText(input.title, 160)
      const description = sanitizePlainText(input.description, 1200)
      if (!title) return "Give the meetup a title."
      if (!description) return "Add a short description so colleagues know what to expect."
      if (!input.startsAt) return "Choose a date and time."
      const startsAt = new Date(input.startsAt)
      if (Number.isNaN(startsAt.getTime())) return "Enter a valid date and time."
      if (input.format === "in-person") {
        const location = sanitizePlainText(input.location ?? "", 240)
        if (!location) return "Add a venue or address for this in-person meetup."
      }
      if (input.format === "online") {
        let meetingUrl = (input.meetingUrl ?? "").trim()
        if (meetingUrl && !/^https?:\/\//i.test(meetingUrl)) meetingUrl = `https://${meetingUrl}`
        if (!isHttpUrl(meetingUrl)) return "Add a Zoom, Google Meet, or other conference link."
        input = { ...input, meetingUrl }
      }
      try {
        const eventId = uid("evt")
        const location = input.format === "in-person" ? sanitizePlainText(input.location ?? "", 240) : ""
        const meetingUrl = input.format === "online" ? sanitizePlainText(input.meetingUrl ?? "", 500) : ""
        await timedWrite(
          setDoc(
            doc(getFirebaseDb(), "events", eventId),
            compact({
              title,
              description,
              hostId: authUser.uid,
              format: input.format,
              startsAt: startsAt.toISOString(),
              location: location || undefined,
              meetingUrl: meetingUrl || undefined,
              rsvpIds: [authUser.uid],
              createdAt: new Date().toISOString(),
            }),
          ),
        )
        notify(`${title} is now on the Meetups board.`)
        return null
      } catch (error) {
        return firebaseErrorMessage(error)
      }
    },
    [authUser, notify],
  )

  const toggleEventRsvp = useCallback(
    async (eventId: string) => {
      if (!authUser) return
      const meetup = events.find((item) => item.id === eventId)
      if (!meetup) return
      const going = meetup.rsvpIds.includes(authUser.uid)
      try {
        await timedWrite(
          updateDoc(doc(getFirebaseDb(), "events", eventId), {
            rsvpIds: going ? arrayRemove(authUser.uid) : arrayUnion(authUser.uid),
          }),
        )
      } catch (error) {
        throw new Error(firebaseErrorMessage(error))
      }
    },
    [authUser, events],
  )

  const deleteMeetup = useCallback(
    async (eventId: string) => {
      if (!authUser) return
      const meetup = events.find((item) => item.id === eventId)
      if (!meetup || meetup.hostId !== authUser.uid) return
      try {
        await timedWrite(deleteDoc(doc(getFirebaseDb(), "events", eventId)))
        notify("Meetup cancelled.")
      } catch (error) {
        throw new Error(firebaseErrorMessage(error))
      }
    },
    [authUser, events, notify],
  )

  const educatorLookup = useCallback(
    (id: string) => educators.find((educator) => educator.id === id),
    [educators],
  )

  const authorName = useCallback(
    (authorId: string) => educatorLookup(authorId)?.name ?? "Educator",
    [educatorLookup],
  )

  const value = useMemo<AppStore>(
    () => ({
      educators,
      resources: resourcesWithFiles,
      posts,
      conversations,
      messages,
      events,
      currentUser,
      isFounder,
      badgeEligible,
      signedIn,
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
      deleteAccount,
      updateProfile,
      claimVerifiedBadge,
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
      uploadChatAttachment,
      markConversationRead,
      conversationWith,
      messagesFor,
      unreadIn,
      createMeetup,
      toggleEventRsvp,
      deleteMeetup,
      educatorById: educatorLookup,
      authorName,
      notify,
    }),
    [
      authorName,
      conversationWith,
      conversations,
      createMeetup,
      currentUser,
      isFounder,
      badgeEligible,
      deleteAccount,
      deleteMeetup,
      deleteResource,
      downloadResource,
      educatorLookup,
      educators,
      events,
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
      messages,
      messagesFor,
      myResources,
      notify,
      posts,
      publishPost,
      ready,
      resourcesWithFiles,
      savedResources,
      sendMessage,
      uploadChatAttachment,
      signedIn,
      signup,
      toasts,
      toggleEventRsvp,
      toggleFollow,
      toggleSave,
      unreadCount,
      unreadIn,
      updateProfile,
      claimVerifiedBadge,
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
