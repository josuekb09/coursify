import { MAX_FILE_BYTES, STORAGE_CAP_BYTES, normalizeSubject } from "@/data"
import { displayType, uploadIssue } from "@/formats"
import {
  firebaseErrorMessage,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  isFirebaseConfigured,
} from "@/firebase"
import {
  inferInstitutionLevel,
  isInstitutionLevel,
  professionalEmailError,
  sanitizePlainText,
  normalizeEmail,
} from "@/security"
import type {
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
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage"
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
  updateProfile: (patch: ProfilePatch) => Promise<string | null>
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
  createMeetup: (input: MeetupInput) => Promise<string | null>
  toggleEventRsvp: (eventId: string) => void
  deleteMeetup: (eventId: string) => void
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
    storageBytes: Number(data.storageBytes) || 0,
    verified: data.verified === true,
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
  if (!body || !data.senderId || !data.conversationId) return null
  return {
    id,
    conversationId: String(data.conversationId),
    senderId: String(data.senderId),
    body,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
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
    storageBytes: extras?.storageBytes ?? 0,
    verified: extras?.verified ?? true,
    institutionLevel:
      extras?.institutionLevel ?? inferInstitutionLevel(email, extras?.school ?? ""),
    photoData: extras?.photoData,
  }
}

function educatorPayload(profile: Educator) {
  return compact({
    email: profile.email,
    name: profile.name,
    initials: profile.initials,
    school: profile.school,
    subject: profile.subject,
    bio: profile.bio,
    joinedYear: profile.joinedYear,
    storageBytes: profile.storageBytes,
    verified: profile.verified,
    institutionLevel: profile.institutionLevel,
    createdAt: new Date().toISOString(),
  })
}

const profileLoads = new Map<string, Promise<Educator>>()

async function loadOrCreateEducator(user: User, extras?: Partial<Educator>): Promise<Educator> {
  const pending = profileLoads.get(user.uid)
  if (pending) return pending

  const task = (async () => {
    const ref = doc(getFirebaseDb(), "educators", user.uid)
    try {
      await user.getIdToken()
      const snap = await getDoc(ref)
      if (snap.exists()) return toEducator(snap.id, asRecord(snap.data()))
    } catch {
      /* Missing doc or a delayed token — create a default profile. */
    }

    const profile = educatorStub(user, extras)
    try {
      await setDoc(ref, educatorPayload(profile), { merge: true })
    } catch {
      return profile
    }
    return profile
  })()

  profileLoads.set(user.uid, task)
  try {
    return await task
  } finally {
    profileLoads.delete(user.uid)
  }
}

async function fileToDataUrl(fileUrl: string) {
  const response = await fetch(fileUrl)
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read that file."))
    reader.readAsDataURL(blob)
  })
}

async function uploadDataUrl(path: string, dataUrl: string) {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const fileRef = storageRef(getFirebaseStorage(), path)
  await uploadBytes(fileRef, blob, { contentType: blob.type || "image/jpeg" })
  return getDownloadURL(fileRef)
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

  function rememberProfile(profile: Educator) {
    setSessionProfile(profile)
    setEducators((current) => [...current.filter((item) => item.id !== profile.id), profile])
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

    const auth = getFirebaseAuth()
    const db = getFirebaseDb()
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user)
      setReady(true)
      if (!user) {
        setSessionProfile(null)
        setLive(false)
        return
      }
      setLive(true)
      void loadOrCreateEducator(user)
        .then((profile) => {
          rememberProfile(profile)
          setLive(true)
        })
        .catch((error) => {
          rememberProfile(educatorStub(user))
          setLive(true)
          notify(firebaseErrorMessage(error))
        })
    })
    const unsubStats = onSnapshot(doc(db, "meta", "stats"), (snap) => {
      setHasAccounts(Boolean(snap.data()?.hasAccounts) || (snap.data()?.users ?? 0) > 0)
    })

    return () => {
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
            const mine =
              incoming.find((item) => item.id === uid) ?? current.find((item) => item.id === uid)
            const rest = incoming.filter((item) => item.id !== uid)
            return mine ? [...rest, mine] : rest
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
    let user: User
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), normalizeEmail(email), password)
      user = cred.user
    } catch (error) {
      return firebaseErrorMessage(error)
    }
    setAuthUser(user)
    setReady(true)
    setLive(true)
    try {
      await user.getIdToken()
      rememberProfile(await loadOrCreateEducator(user))
    } catch (error) {
      rememberProfile(educatorStub(user))
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
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, input.password)
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
      verified: true,
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
      await user.getIdToken()
      await setDoc(doc(getFirebaseDb(), "educators", user.uid), educator)
      await setDoc(doc(getFirebaseDb(), "meta", "stats"), { hasAccounts: true, users: increment(1) }, { merge: true })
    } catch (error) {
      notify(firebaseErrorMessage(error))
    }
    return null
  }, [notify])

  const logout = useCallback(() => {
    void signOut(getFirebaseAuth())
  }, [])

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!authUser) return "Sign in to update your profile."
      try {
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

        const applyLocal = (photo?: string) => {
          const next = {
            ...(currentUser ?? educatorStub(authUser, { name, school, subject, bio, institutionLevel })),
            name,
            initials,
            school,
            subject,
            bio,
            institutionLevel,
            photoData: photo,
          }
          setEducators((current) => [...current.filter((item) => item.id !== authUser.uid), next])
        }

        applyLocal(photoData || undefined)

        if (photoData && photoData.startsWith("data:image/")) {
          photoData = await uploadDataUrl(`avatars/${authUser.uid}/avatar-${Date.now()}.jpg`, photoData)
          applyLocal(photoData)
        }

        await setDoc(
          doc(getFirebaseDb(), "educators", authUser.uid),
          {
            name,
            initials,
            school,
            subject,
            bio,
            institutionLevel,
            updatedAt: new Date().toISOString(),
            photoData: photoData ? photoData : deleteField(),
          },
          { merge: true },
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

  const uploadResource = useCallback(
    async (input: UploadInput) => {
      if (!authUser || !currentUser) return "Sign in to upload."
      const title = sanitizePlainText(input.title, 160)
      if (!title) return "Give the resource a title."
      const issue = uploadIssue({ ...input, sourceUrl: input.sourceUrl ?? "" })
      if (issue) return issue
      if (input.file && input.file.size > MAX_FILE_BYTES) {
        return "Please keep uploads under 4 MB for this workspace."
      }
      const size = input.file?.size ?? 0
      if (currentUser.storageBytes + size > STORAGE_CAP_BYTES) {
        return "Not enough storage for this file."
      }
      try {
        const resourceId = uid("res")
        let fileUrl: string | undefined
        let storagePath: string | undefined
        if (input.file) {
          storagePath = `resources/${authUser.uid}/${resourceId}/${input.file.name}`
          const fileRef = storageRef(getFirebaseStorage(), storagePath)
          await uploadBytes(fileRef, input.file)
          fileUrl = await getDownloadURL(fileRef)
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
        await setDoc(doc(getFirebaseDb(), "resources", resourceId), resource)
        await addDoc(collection(getFirebaseDb(), "posts"), {
          authorId: authUser.uid,
          body: `Shared ${title} with the library.`,
          resourceId,
          createdAt: new Date().toISOString(),
        })
        if (size) {
          await updateDoc(doc(getFirebaseDb(), "educators", authUser.uid), {
            storageBytes: increment(size),
          })
        }
        notify(`${title} was added to your library.`)
        return null
      } catch (error) {
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
        await updateDoc(doc(getFirebaseDb(), "resources", id), { downloads: increment(1) })
      } catch {
        /* still allow the download */
      }
      return { ...resource, downloads: resource.downloads + 1 }
    },
    [hydrateResource],
  )

  const toggleSave = useCallback(
    (id: string) => {
      if (!authUser) return
      const saveId = `${authUser.uid}_${id}`
      const saved = savedIds.includes(id)
      void (async () => {
        try {
          if (saved) await deleteDoc(doc(getFirebaseDb(), "saves", saveId))
          else await setDoc(doc(getFirebaseDb(), "saves", saveId), { userId: authUser.uid, resourceId: id })
          await updateDoc(doc(getFirebaseDb(), "resources", id), { saves: increment(saved ? -1 : 1) })
        } catch (error) {
          notify(firebaseErrorMessage(error))
        }
      })()
    },
    [authUser, notify, savedIds],
  )

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds])

  const toggleFollow = useCallback(
    (educatorId: string) => {
      if (!authUser || educatorId === authUser.uid) return
      const followId = `${authUser.uid}_${educatorId}`
      const following = (followsByUser[authUser.uid] ?? []).includes(educatorId)
      void (async () => {
        try {
          if (following) await deleteDoc(doc(getFirebaseDb(), "follows", followId))
          else {
            await setDoc(doc(getFirebaseDb(), "follows", followId), {
              followerId: authUser.uid,
              followeeId: educatorId,
              createdAt: new Date().toISOString(),
            })
          }
        } catch (error) {
          notify(firebaseErrorMessage(error))
        }
      })()
    },
    [authUser, followsByUser, notify],
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
        await addDoc(collection(getFirebaseDb(), "posts"), compact({
          authorId: authUser.uid,
          body: text || "Shared a resource with colleagues.",
          resourceId,
          createdAt: new Date().toISOString(),
        }))
        notify("Posted to the academic feed.")
        return null
      } catch (error) {
        return firebaseErrorMessage(error)
      }
    },
    [authUser, notify],
  )

  const sendMessage = useCallback(
    async (peerId: string, body: string) => {
      if (!authUser) return "Sign in to send a message."
      if (peerId === authUser.uid) return "You cannot message yourself."
      const text = sanitizePlainText(body, 2000)
      if (!text) return "Write a message first."
      const now = new Date().toISOString()
      const conversationId = conversationIdFor(authUser.uid, peerId)
      const participantIds = [authUser.uid, peerId].sort()
      try {
        await setDoc(
          doc(getFirebaseDb(), "conversations", conversationId),
          {
            participantIds,
            updatedAt: now,
            lastMessage: text,
          },
          { merge: true },
        )
        await updateDoc(doc(getFirebaseDb(), "conversations", conversationId), {
          [`lastReadAt.${authUser.uid}`]: now,
        })
        await addDoc(collection(getFirebaseDb(), "messages"), {
          conversationId,
          senderId: authUser.uid,
          body: text,
          createdAt: now,
          participantIds,
        })
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
        await setDoc(
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
    (eventId: string) => {
      if (!authUser) return
      const meetup = events.find((item) => item.id === eventId)
      if (!meetup) return
      const going = meetup.rsvpIds.includes(authUser.uid)
      void updateDoc(doc(getFirebaseDb(), "events", eventId), {
        rsvpIds: going ? arrayRemove(authUser.uid) : arrayUnion(authUser.uid),
      }).catch((error) => notify(firebaseErrorMessage(error)))
    },
    [authUser, events, notify],
  )

  const deleteMeetup = useCallback(
    (eventId: string) => {
      if (!authUser) return
      const meetup = events.find((item) => item.id === eventId)
      if (!meetup || meetup.hostId !== authUser.uid) return
      void deleteDoc(doc(getFirebaseDb(), "events", eventId)).catch((error) =>
        notify(firebaseErrorMessage(error)),
      )
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
      signedIn,
      signup,
      toasts,
      toggleEventRsvp,
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
