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
  Slide,
  Toast,
  UploadInput,
} from "@/types"
import { isZipBytes, parsePptx } from "@/documents"
import { extensionOf } from "@/formats"
import { blobToDataUrl, deleteVaultFile, getVaultFile, saveVaultFile } from "@/file-vault"
import {
  conversationIdFor,
  formatBytes,
  initialsFromName,
  isEducatorOnline,
  isHttpUrl,
  kindLabel,
  normalizeMeetingUrl,
  uid,
} from "@/utils"
import { playMessageChime } from "@/sound"
import { dispatchOfflineEmailNotification } from "@/notifications"
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
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
  writeBatch,
  type Query,
} from "firebase/firestore"
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref as storageRef,
  uploadBytesResumable,
  type StorageReference,
} from "firebase/storage"
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

type FollowRow = { id: string; followerId: string; followeeId: string }

/**
 * Where an upload's bytes ended up:
 * - "cloud": Firebase Storage, available on every device
 * - "inline": small file stored inside the Firestore document, available on every device
 * - "device": Storage was unreachable and the file was too large to inline; only this browser has it
 */
export type UploadResult = {
  error: string | null
  stored: "cloud" | "inline" | "device" | "none"
  canceled?: boolean
}

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
  resetPassword: (email: string) => Promise<string | null>
  resendVerification: () => Promise<string | null>
  emailVerified: boolean
  logout: () => void
  deleteAccount: (password: string) => Promise<string | null>
  updateProfile: (patch: ProfilePatch) => Promise<string | null>
  claimVerifiedBadge: () => Promise<string | null>
  uploadResource: (
    input: UploadInput,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ) => Promise<UploadResult>
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
  uploadChatAttachment: (
    file: File,
    options?: { onProgress?: (progress: number) => void; signal?: AbortSignal },
  ) => Promise<ChatAttachment>
  markConversationRead: (conversationId: string) => void
  signalTyping: (peerId: string) => void
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
  const founder = data.founder === true || isFounderEmail(String(data.email ?? ""))
  return {
    id,
    // Only legacy profiles carry an email; new ones keep it in the private accounts/{uid} doc.
    email: String(data.email ?? ""),
    founder,
    name: String(data.name ?? "Educator"),
    initials: String(data.initials ?? initialsFromName(String(data.name ?? "E"))),
    school: String(data.school ?? ""),
    subject: normalizeSubject(String(data.subject ?? "Mathematics")),
    bio: String(data.bio ?? ""),
    joinedYear: Number(data.joinedYear) || new Date().getFullYear(),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    storageBytes: Number(data.storageBytes) || 0,
    verified: founder || data.badgeClaimed === true || data.verified === true,
    badgeClaimed: founder || data.badgeClaimed === true,
    institutionLevel: isInstitutionLevel(data.institutionLevel) ? data.institutionLevel : "high-school",
    photoData: typeof data.photoData === "string" ? data.photoData : undefined,
    lastActiveAt: typeof data.lastActiveAt === "string" ? data.lastActiveAt : undefined,
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
    fileData: typeof data.fileData === "string" ? data.fileData : undefined,
    // Older uploads stored a fake `coursify-cloud-storage://` marker when Storage failed.
    fileUrl: typeof data.fileUrl === "string" && isHttpUrl(data.fileUrl) ? data.fileUrl : undefined,
    storagePath: typeof data.storagePath === "string" ? data.storagePath : undefined,
    localOnly:
      data.localOnly === true ||
      (typeof data.fileUrl === "string" && data.fileUrl.startsWith("coursify-cloud-storage://")),
    sourceUrl: typeof data.sourceUrl === "string" ? data.sourceUrl : undefined,
    slides: Array.isArray(data.slides) ? (data.slides as Slide[]) : undefined,
    createdAt: String(data.createdAt ?? new Date().toISOString().slice(0, 10)),
    hasFile: Boolean(data.fileUrl || data.storagePath || data.fileData || data.hasFile),
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
    lastMessage: typeof data.lastMessage === "string" ? data.lastMessage : undefined,
    typingAt: Object.fromEntries(Object.entries(asRecord(data.typingAt)).map(([key, value]) => [key, String(value)])),
  }
}

function toMessage(id: string, data: Record<string, unknown>, pending = false): ChatMessage | null {
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
    pending: pending || undefined,
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
    founder: isFounderEmail(email),
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
    lastActiveAt: profile.lastActiveAt,
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
    school: next.school !== undefined ? next.school : base.school,
    bio: next.bio !== undefined ? next.bio : base.bio,
    photoData: next.photoData !== undefined ? next.photoData : base.photoData,
    institutionLevel: next.institutionLevel || base.institutionLevel,
    storageBytes: next.storageBytes || base.storageBytes,
    verified: isFounderEmail(next.email) || next.badgeClaimed === true || next.verified === true || base.verified === true,
    badgeClaimed: isFounderEmail(next.email) || next.badgeClaimed === true || base.badgeClaimed === true,
    lastActiveAt: next.lastActiveAt || base.lastActiveAt,
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

// Formats whose preview is rendered from the raw bytes (DOCX text, PPTX slides, CSV, plain text).
const PREVIEW_FETCH_LIMIT = 15 * 1024 * 1024

function needsBytesForPreview(resource: Resource) {
  const ext = extensionOf(resource.fileName ?? "")
  if (["docx", "pptx", "csv", "txt", "md", "json", "py", "js", "ts"].includes(ext)) return true
  return Boolean(resource.mimeType?.startsWith("text/"))
}

async function fileToDataUrl(fileUrl: string) {
  if (fileUrl.startsWith("data:")) return fileUrl
  const response = await withTimeout(fetch(fileUrl), 20_000, "Could not load that file. Please try again.")
  if (!response.ok) throw new Error(`Could not load that file (HTTP ${response.status}).`)
  const blob = await withTimeout(response.blob(), 30_000, "Could not read that file.")
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read that file."))
    reader.readAsDataURL(blob)
  })
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Could not read file data."))
    reader.readAsDataURL(file)
  })
}

async function compressImageToSafeDataUrl(
  file: File,
  maxDimension = 1200,
): Promise<{ dataUrl: string; sizeStr: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read image file."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Could not parse image."))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, width)
        canvas.height = Math.max(1, height)
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          const raw = String(reader.result)
          resolve({ dataUrl: raw, sizeStr: `${Math.round((raw.length * 0.75) / 1024)} KB` })
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        let quality = 0.75
        let dataUrl = canvas.toDataURL("image/jpeg", quality)
        if (dataUrl.length > 650_000) {
          quality = 0.55
          dataUrl = canvas.toDataURL("image/jpeg", quality)
        }
        if (dataUrl.length > 650_000) {
          canvas.width = Math.round(width * 0.7)
          canvas.height = Math.round(height * 0.7)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          dataUrl = canvas.toDataURL("image/jpeg", 0.5)
        }
        const sizeBytes = Math.round(dataUrl.length * 0.75)
        const sizeStr =
          sizeBytes > 1_048_576
            ? `${(sizeBytes / 1_048_576).toFixed(1)} MB`
            : `${Math.round(sizeBytes / 1024)} KB`
        resolve({ dataUrl, sizeStr })
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

async function extractPptxSlides(file: File): Promise<Slide[] | undefined> {
  try {
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (!isZipBytes(bytes)) return undefined
    const parsed = await parsePptx(bytes)
    if (!parsed || parsed.length === 0) return undefined
    return parsed.slice(0, 30).map((slide, index) => {
      const textNodes = slide.nodes
        .flatMap((n) => n.paragraphs?.map((p) => p.text.trim()) ?? [])
        .filter(Boolean)
      return {
        title: textNodes[0] || `Slide ${index + 1}`,
        subtitle: textNodes[1] || "",
        bullets: textNodes.slice(2, 8),
      }
    })
  } catch {
    return undefined
  }
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

// A resumable upload is only abandoned when no bytes move for this long. Large files on a
// slow connection keep going as long as they make progress; the user can always cancel.
const UPLOAD_STALL_MS = 120_000

export class UploadCanceledError extends Error {
  constructor() {
    super("Upload canceled.")
    this.name = "UploadCanceledError"
  }
}

class StorageUnreachableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = "StorageUnreachableError"
  }
}

function storageErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : ""
}

/**
 * Errors that mean "Storage cannot be reached right now" (offline, bucket missing, server
 * unavailable, stalled) as opposed to errors that mean the upload itself is not allowed.
 * Only the first kind may fall back to a non-cloud copy.
 */
function isStorageUnreachable(error: unknown) {
  if (error instanceof StorageUnreachableError) return true
  const code = storageErrorCode(error)
  return (
    code === "storage/retry-limit-exceeded" ||
    code === "storage/unknown" ||
    code === "storage/bucket-not-found" ||
    code === "storage/project-not-found" ||
    code === "storage/server-file-wrong-size" ||
    code === "storage/no-default-bucket" ||
    code === "storage/internal-error"
  )
}

/**
 * Uploads a file to Firebase Storage with the resumable API. Progress is reported from real
 * byte counts, the caller can cancel through `signal`, and the upload only times out when it
 * stops making progress for UPLOAD_STALL_MS.
 */
async function uploadToStorage(
  path: string,
  file: Blob,
  contentType: string,
  options: { onProgress?: (progress: number) => void; signal?: AbortSignal } = {},
): Promise<string> {
  const { onProgress, signal } = options
  if (signal?.aborted) throw new UploadCanceledError()
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new StorageUnreachableError("You appear to be offline.")
  }
  const fileRef: StorageReference = storageRef(getFirebaseStorage(), path)

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let stallTimer = 0
    const task = uploadBytesResumable(fileRef, file, { contentType })

    const finish = (error?: unknown) => {
      if (settled) return
      settled = true
      window.clearTimeout(stallTimer)
      signal?.removeEventListener("abort", onAbort)
      if (error) reject(error)
      else resolve()
    }
    const armStallTimer = () => {
      window.clearTimeout(stallTimer)
      stallTimer = window.setTimeout(() => {
        task.cancel()
        finish(new StorageUnreachableError("The upload stopped making progress."))
      }, UPLOAD_STALL_MS)
    }
    function onAbort() {
      task.cancel()
      finish(new UploadCanceledError())
    }

    signal?.addEventListener("abort", onAbort)
    armStallTimer()
    task.on(
      "state_changed",
      (snapshot) => {
        armStallTimer()
        const total = snapshot.totalBytes || file.size || 1
        onProgress?.(Math.min(99, Math.round((snapshot.bytesTransferred / total) * 100)))
      },
      (error) => finish(storageErrorCode(error) === "storage/canceled" ? new UploadCanceledError() : error),
      () => finish(),
    )
  })

  const url = await withTimeout(
    getDownloadURL(fileRef),
    20_000,
    "The file uploaded, but its download link could not be created. Please try again.",
  )
  onProgress?.(100)
  return url
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  zip: "application/zip",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
  py: "text/x-python",
  js: "text/javascript",
  ts: "text/typescript",
}

// Storage rules refuse types a browser would execute, so code and web pages are kept as plain text.
const ACTIVE_CONTENT = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|(text|application)\/(x-)?javascript)/i

function contentTypeFor(file: File) {
  const type = file.type || MIME_BY_EXTENSION[extensionOf(file.name)] || "application/octet-stream"
  return ACTIVE_CONTENT.test(type) ? "text/plain" : type
}

// Firestore documents are capped at 1 MiB, so only small files can travel inside one.
const INLINE_FILE_LIMIT = 650_000

export const TERMS_VERSION = "2026-10-31"

/** Length beats complexity, but a password made of one character class is too easy to guess. */
export function passwordIssue(password: string) {
  if (password.length < 10) return "Use at least 10 characters for your password."
  if (password.length > 128) return "That password is too long."
  if (!/[a-zA-Z]/.test(password) || !/[0-9\W_]/.test(password)) {
    return "Mix letters with at least one number or symbol."
  }
  return null
}

function badgeEvidenceFor(resources: Resource[], authorId: string) {
  return resources
    .filter((resource) => resource.authorId === authorId)
    .slice(0, 3)
    .map((resource) => resource.id)
}

const migratedProfiles = new Set<string>()

/** Moves a legacy public email into the private accounts/{uid} document. */
async function migratePrivateProfile(uid: string, authEmail: string, data: Record<string, unknown>) {
  if (migratedProfiles.has(uid)) return
  migratedProfiles.add(uid)
  const email = normalizeEmail(authEmail)
  if (!email) return
  const db = getFirebaseDb()
  try {
    await setDoc(doc(db, "accounts", uid), { email, updatedAt: new Date().toISOString() }, { merge: true })
    const patch: Record<string, unknown> = {}
    if ("email" in data) patch.email = deleteField()
    if (isFounderEmail(email) && data.founder !== true) patch.founder = true
    if (Object.keys(patch).length) await updateDoc(doc(db, "educators", uid), patch)
  } catch {
    migratedProfiles.delete(uid)
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
  const [accountEmails, setAccountEmails] = useState<Record<string, string>>({})
  const lastMessageCountRef = useRef<number>(0)
  const lastHeartbeatRef = useRef<number>(0)

  const notify = useCallback((message: string) => {
    const id = uid("toast")
    setToasts((current) => [...current, { id, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2800)
  }, [])

  const currentUser = useMemo(() => {
    if (!authUser) return null
    const found = educators.find((educator) => educator.id === authUser.uid) ?? sessionProfile
    if (!found) return null
    // The signed-in user's email comes from Auth, never from the public profile.
    const email = normalizeEmail(authUser.email ?? found.email)
    return found.email === email ? found : { ...found, email }
  }, [authUser, educators, sessionProfile])
  const signedIn = Boolean(authUser)
  const isFounder = isFounderEmail(authUser?.email ?? "")

  // Only the founder can read accounts/*; everyone else sees profiles without email addresses.
  useEffect(() => {
    if (!isFounder || !isFirebaseConfigured()) {
      setAccountEmails({})
      return
    }
    return onSnapshot(
      collection(getFirebaseDb(), "accounts"),
      (snap) => {
        const next: Record<string, string> = {}
        snap.docs.forEach((item) => {
          const email = asRecord(item.data()).email
          if (typeof email === "string") next[item.id] = email
        })
        setAccountEmails(next)
      },
      () => undefined,
    )
  }, [isFounder])

  const visibleEducators = useMemo(
    () =>
      Object.keys(accountEmails).length === 0
        ? educators
        : educators.map((educator) =>
            educator.email ? educator : { ...educator, email: accountEmails[educator.id] ?? "" },
          ),
    [accountEmails, educators],
  )
  const badgeEligible = Boolean(
    currentUser &&
      !currentUser.verified &&
      currentUser.name.trim() &&
      currentUser.bio.trim() &&
      currentUser.school.trim() &&
      currentUser.subject.trim() &&
      currentUser.institutionLevel &&
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
          const data = asRecord(snap.data())
          rememberProfile(toEducator(snap.id, data))
          setLive(true)
          if ("email" in data || (isFounderEmail(authUser.email ?? "") && data.founder !== true)) {
            void migratePrivateProfile(uid, authUser.email ?? "", data)
          }
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
        // Metadata changes let an outgoing message flip from "sending" to "sent" once the server acks it.
        { includeMetadataChanges: true },
        (snap) => {
          const incoming = snap.docs
            .map((item) => toMessage(item.id, asRecord(item.data()), item.metadata.hasPendingWrites))
            .filter((item): item is ChatMessage => item !== null)
            .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

          // Play incoming chime if a new message from colleague arrived
          if (lastMessageCountRef.current > 0 && incoming.length > lastMessageCountRef.current) {
            const latest = incoming.at(-1)
            if (latest && latest.senderId !== authUser.uid) {
              const diffMs = Date.now() - new Date(latest.createdAt).getTime()
              if (diffMs >= 0 && diffMs < 25_000) {
                playMessageChime()
              }
            }
          }
          lastMessageCountRef.current = incoming.length
          setMessages(incoming)
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

  // Maintain accurate online presence heartbeat
  useEffect(() => {
    if (!authUser?.uid || !isFirebaseConfigured()) return
    const uid = authUser.uid
    const db = getFirebaseDb()

    let lastSent = 0
    function sendHeartbeat(force = false) {
      const now = Date.now()
      if (!force && now - lastSent < 45_000) return
      lastSent = now
      void updateDoc(doc(db, "educators", uid), {
        lastActiveAt: new Date().toISOString(),
      }).catch(() => undefined)
    }

    sendHeartbeat(true)
    const interval = window.setInterval(() => sendHeartbeat(true), 60_000)

    const handleActivity = () => sendHeartbeat(false)
    const handleFocus = () => sendHeartbeat(true)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat(true)
      }
    }

    window.addEventListener("pointerdown", handleActivity, { passive: true })
    window.addEventListener("keydown", handleActivity, { passive: true })
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("pointerdown", handleActivity)
      window.removeEventListener("keydown", handleActivity)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [authUser?.uid])

  // Automatically award badge when user meets merit criteria
  useEffect(() => {
    if (!authUser?.uid || !currentUser) return
    if (currentUser.verified || currentUser.badgeClaimed) return
    if (badgeEligible) {
      void (async () => {
        try {
          await updateDoc(doc(getFirebaseDb(), "educators", authUser.uid), {
            verified: true,
            badgeClaimed: true,
            badgeClaimedAt: new Date().toISOString(),
            badgeEvidence: badgeEvidenceFor(resources, authUser.uid),
          })
          rememberProfile({
            ...currentUser,
            verified: true,
            badgeClaimed: true,
          })
          notify("Congratulations! You've unlocked the Verified Educator Badge.")
        } catch {
          /* ignore */
        }
      })()
    }
  }, [authUser?.uid, badgeEligible, currentUser, notify, resources])

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
    const passwordError = passwordIssue(input.password)
    if (passwordError) return passwordError
    if (!input.acceptedTerms) return "Please accept the Terms of Use and Privacy Policy to continue."
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
      name,
      founder: isFounderEmail(email) || undefined,
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
    rememberProfile(toEducator(user.uid, asRecord({ ...educator, email })))
    void sendEmailVerification(user).catch(() => undefined)
    setReady(true)
    setLive(true)
    try {
      await withTimeout(user.getIdToken(), 8_000, "Could not verify your session. Please try again.")
      await timedWrite(setDoc(doc(getFirebaseDb(), "educators", user.uid), educator))
      await timedWrite(
        setDoc(doc(getFirebaseDb(), "accounts", user.uid), {
          email,
          updatedAt: new Date().toISOString(),
          acceptedTermsAt: new Date().toISOString(),
          acceptedTermsVersion: TERMS_VERSION,
        }),
      )
      await timedWrite(
        setDoc(doc(getFirebaseDb(), "meta", "stats"), { hasAccounts: true, users: increment(1) }, { merge: true }),
      )
    } catch (error) {
      notify(firebaseErrorMessage(error))
    }
    return null
  }, [notify])

  const resetPassword = useCallback(async (email: string) => {
    const normalized = normalizeEmail(email)
    if (!normalized) return "Enter the email address you signed up with."
    if (!isFirebaseConfigured()) return "Coursify is not connected to Firebase yet."
    try {
      await withTimeout(
        sendPasswordResetEmail(getFirebaseAuth(), normalized),
        REQUEST_MS,
        "Sending the reset email timed out. Please try again.",
      )
    } catch (error) {
      // Same answer whether or not the address has an account, so the form cannot be used to
      // find out who is registered.
      const code = String((error as { code?: string })?.code ?? "")
      if (code !== "auth/user-not-found" && code !== "auth/invalid-email") return firebaseErrorMessage(error)
    }
    return null
  }, [])

  const resendVerification = useCallback(async () => {
    const user = getFirebaseAuth().currentUser
    if (!user) return "Sign in first."
    try {
      await withTimeout(sendEmailVerification(user), REQUEST_MS, "Sending the email timed out. Please try again.")
      return null
    } catch (error) {
      return firebaseErrorMessage(error)
    }
  }, [])

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
    const userResources = resources.filter((resource) => resource.authorId === currentUser.id)
    const hasCompleteProfile = Boolean(
      currentUser.name.trim() &&
        currentUser.bio.trim() &&
        currentUser.school.trim() &&
        currentUser.subject.trim() &&
        currentUser.institutionLevel,
    )
    const eligible =
      isFounderEmail(currentUser.email) ||
      (hasCompleteProfile && userResources.length >= 3)
    if (!eligible) {
      return "Complete your profile (100%) and share at least three curriculum resources to unlock this badge."
    }
    try {
      await timedWrite(
        updateDoc(doc(getFirebaseDb(), "educators", authUser.uid), {
          verified: true,
          badgeClaimed: true,
          badgeClaimedAt: new Date().toISOString(),
          badgeEvidence: badgeEvidenceFor(resources, authUser.uid),
        }),
        "Could not claim your badge. Please try again.",
      )
      rememberProfile({
        ...currentUser,
        verified: true,
        badgeClaimed: true,
      })
      notify("Congratulations! You've unlocked the Verified Educator Badge.")
      return null
    } catch (error) {
      return firebaseErrorMessage(error)
    }
  }, [authUser, currentUser, notify, resources])

  // Auto-award verified badge if educator meets strict merit criteria
  useEffect(() => {
    if (authUser && currentUser && badgeEligible && !currentUser.verified && !currentUser.badgeClaimed) {
      void claimVerifiedBadge()
    }
  }, [authUser, currentUser, badgeEligible, claimVerifiedBadge])

  // Throttled real-time presence heartbeat (updates lastActiveAt max once every 60s during active interaction)
  useEffect(() => {
    if (!authUser || !currentUser) return

    const sendHeartbeat = () => {
      if (document.visibilityState === "hidden") return
      const now = Date.now()
      if (now - lastHeartbeatRef.current < 60_000) return
      lastHeartbeatRef.current = now

      const nowIso = new Date().toISOString()
      if (isFirebaseConfigured()) {
        try {
          const db = getFirebaseDb()
          updateDoc(doc(db, "educators", authUser.uid), {
            lastActiveAt: nowIso,
          }).catch(() => {
            // Non-blocking background heartbeat
          })
        } catch {
          // Ignore
        }
      }
      setSessionProfile((prev) => (prev ? { ...prev, lastActiveAt: nowIso } : null))
    }

    sendHeartbeat()

    const onActivity = () => {
      sendHeartbeat()
    }

    window.addEventListener("mousedown", onActivity, { passive: true })
    window.addEventListener("keydown", onActivity, { passive: true })
    window.addEventListener("touchstart", onActivity, { passive: true })
    window.addEventListener("focus", onActivity)
    document.addEventListener("visibilitychange", onActivity)

    const interval = window.setInterval(sendHeartbeat, 60_000)

    return () => {
      window.removeEventListener("mousedown", onActivity)
      window.removeEventListener("keydown", onActivity)
      window.removeEventListener("touchstart", onActivity)
      window.removeEventListener("focus", onActivity)
      document.removeEventListener("visibilitychange", onActivity)
      clearInterval(interval)
    }
  }, [authUser, currentUser?.id])

  const uploadResource = useCallback(
    async (
      input: UploadInput,
      onProgress?: (progress: number) => void,
      signal?: AbortSignal,
    ): Promise<UploadResult> => {
      const fail = (error: string): UploadResult => ({ error, stored: "none" })
      if (!authUser || !currentUser) return fail("Sign in to upload.")
      const title = sanitizePlainText(input.title, 160)
      if (!title) return fail("Give the resource a title.")
      const issue = uploadIssue({ ...input, sourceUrl: input.sourceUrl ?? "" })
      if (issue) return fail(issue)
      if (input.file && input.file.size > MAX_FILE_BYTES) {
        return fail(`Please keep uploads at or below ${Math.round(MAX_FILE_BYTES / 1_048_576)} MB.`)
      }
      const size = input.file?.size ?? 0
      if (currentUser.storageBytes + size > STORAGE_CAP_BYTES) {
        return fail("Not enough storage for this file.")
      }
      let storagePath: string | undefined
      let uploadedPath: string | undefined
      let stored: UploadResult["stored"] = "none"
      const resourceId = uid("res")
      try {
        let fileUrl: string | undefined
        let fileData: string | undefined
        let extractedSlides: Slide[] | undefined

        if (input.file) {
          const fileName = input.file.name.replace(/[\\/#?\[\]]/g, "_")
          const contentType = contentTypeFor(input.file)

          // Keep the original bytes on this device so previews open instantly here.
          await saveVaultFile(resourceId, input.file, fileName, contentType)

          if (input.file.name.toLowerCase().endsWith(".pptx")) {
            extractedSlides = await extractPptxSlides(input.file)
          }

          try {
            storagePath = `resources/${authUser.uid}/${resourceId}/${fileName}`
            fileUrl = await uploadToStorage(storagePath, input.file, contentType, { onProgress, signal })
            uploadedPath = storagePath
            stored = "cloud"
          } catch (error) {
            storagePath = undefined
            if (error instanceof UploadCanceledError) {
              void deleteVaultFile(resourceId)
              return { error: "Upload canceled.", stored: "none", canceled: true }
            }
            if (!isStorageUnreachable(error)) throw error
            console.warn("Firebase Storage unreachable, using fallback copy.", error)
            if (size <= INLINE_FILE_LIMIT) {
              // Small files fit inside the Firestore document, so they still reach every device.
              fileData = await readFileAsDataUrl(input.file)
              setHydratedFiles((current) => ({ ...current, [resourceId]: fileData! }))
              stored = "inline"
            } else {
              // Too big for Firestore: only this browser's vault holds the bytes.
              stored = "device"
            }
            onProgress?.(100)
          }
        }

        const resource = compact({
          title,
          authorId: authUser.uid,
          subject: input.subject,
          grade: input.grade,
          kind: input.kind,
          format: input.format,
          mimeType: input.file ? (input.file.type || undefined) : undefined,
          type: displayType(kindLabel(input.kind), {
            format: input.format,
            fileName: input.file?.name,
            sourceUrl: input.sourceUrl,
          }),
          downloads: 0,
          saves: 0,
          fileName: input.file?.name ? sanitizePlainText(input.file.name, 120) : undefined,
          fileSize: input.file ? `${(input.file.size / 1_000_000).toFixed(1)} MB` : undefined,
          fileBytes: size || undefined,
          fileData,
          fileUrl,
          storagePath,
          localOnly: stored === "device" ? true : undefined,
          slides: extractedSlides ?? input.slides,
          hasFile: Boolean(fileData || fileUrl || storagePath || input.file),
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
        if (stored !== "device") notify(`${title} was added to your library.`)
        return { error: null, stored }
      } catch (error) {
        if (uploadedPath) {
          await deleteObject(storageRef(getFirebaseStorage(), uploadedPath)).catch(() => undefined)
        }
        void deleteVaultFile(resourceId)
        return { error: firebaseErrorMessage(error), stored: "none" as const }
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
          void deleteVaultFile(id)
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
        return { ...resource, fileData: resource.fileData ?? hydratedFiles[id], hasFile: true }
      }
      try {
        const vaulted = await getVaultFile(id)
        if (vaulted) {
          const fileData = await blobToDataUrl(vaulted.blob)
          setHydratedFiles((current) => ({ ...current, [id]: fileData }))
          return {
            ...resource,
            fileData,
            fileName: resource.fileName || vaulted.fileName,
            mimeType: resource.mimeType || vaulted.mimeType,
            hasFile: true,
          }
        }
      } catch (error) {
        console.warn("Could not read the local file vault.", error)
      }
      // Device-only uploads have no cloud copy; the preview explains that to the viewer.
      if (resource.localOnly) return resource

      let fileUrl = resource.fileUrl
      if (!fileUrl && resource.storagePath) {
        try {
          fileUrl = await withTimeout(
            getDownloadURL(storageRef(getFirebaseStorage(), resource.storagePath)),
            10_000,
            "Could not reach file storage.",
          )
        } catch (error) {
          console.warn("Could not resolve the Storage download link.", error)
          return resource
        }
      }
      if (!fileUrl) return resource

      // PDFs, videos and archives are previewed or downloaded straight from their URL. Only
      // formats the app parses in the browser need their bytes, and only when reasonably small.
      if (!needsBytesForPreview(resource) || (resource.fileBytes ?? 0) > PREVIEW_FETCH_LIMIT) {
        return { ...resource, fileUrl, hasFile: true }
      }
      try {
        const fileData = await fileToDataUrl(fileUrl)
        setHydratedFiles((current) => ({ ...current, [id]: fileData }))
        return { ...resource, fileUrl, fileData, hasFile: true }
      } catch (error) {
        console.warn("Could not fetch the file for preview.", error)
        return { ...resource, fileUrl, hasFile: true }
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
    async (
      file: File,
      options: { onProgress?: (progress: number) => void; signal?: AbortSignal } = {},
    ): Promise<ChatAttachment> => {
      if (!authUser) throw new Error("Sign in to send attachments.")
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`Attachments must be ${Math.round(MAX_FILE_BYTES / 1_048_576)} MB or less.`)
      }
      if ((currentUser?.storageBytes ?? 0) + file.size > STORAGE_CAP_BYTES) {
        throw new Error("Not enough storage left for this attachment.")
      }
      const fileId = uid("att")
      const safeName = file.name.replace(/[\\/#?\[\]]/g, "_")
      const contentType = contentTypeFor(file)
      const size = formatBytes(file.size)

      try {
        const url = await uploadToStorage(
          `resources/${authUser.uid}/chat/${fileId}_${safeName}`,
          file,
          contentType,
          options,
        )
        // Chat files live in the same bucket folder as resources, so they count toward the quota.
        await timedWrite(
          updateDoc(doc(getFirebaseDb(), "educators", authUser.uid), { storageBytes: increment(file.size) }),
        ).catch((error) => console.warn("Could not update storage usage.", error))
        return { url, name: file.name, type: contentType, size }
      } catch (error) {
        if (error instanceof UploadCanceledError || !isStorageUnreachable(error)) throw error
        console.warn("Firebase Storage unreachable, sending attachment inline.", error)
      }

      // Storage is unreachable. Small files can still travel inside the message document,
      // which both participants can read on any device.
      if (file.type.startsWith("image/")) {
        const { dataUrl, sizeStr } = await compressImageToSafeDataUrl(file)
        if (dataUrl.length <= 700_000) return { url: dataUrl, name: file.name, type: "image/jpeg", size: sizeStr }
      } else if (file.size <= 500_000) {
        const dataUrl = await readFileAsDataUrl(file)
        if (dataUrl.length <= 700_000) return { url: dataUrl, name: file.name, type: contentType, size }
      }
      throw new Error(
        "File storage is unreachable right now, so only files under 500 KB can be sent. Try again when your connection is back.",
      )
    },
    [authUser, currentUser?.storageBytes],
  )

  const sendMessage = useCallback(
    async (peerId: string, body: string, attachment?: ChatAttachment) => {
      if (!authUser) return "Sign in to send a message."
      if (peerId === authUser.uid) return "You cannot message yourself."
      const text = sanitizePlainText(body, 2000)
      if (!text && !attachment) return "Write a message or attach a file first."
      if (attachment?.url && attachment.url.length > 700_000) {
        return "That attachment is too large to send. Try a smaller file."
      }
      const now = new Date().toISOString()
      const conversationId = conversationIdFor(authUser.uid, peerId)
      const participantIds = [authUser.uid, peerId].sort()
      const previewText = text || (attachment ? `Shared ${attachment.name}` : "Shared an attachment")
      const db = getFirebaseDb()
      try {
        // One atomic batch: the message lands in the local cache immediately (the "sending"
        // tick) and the conversation preview and read marker can never disagree with it.
        const batch = writeBatch(db)
        batch.set(
          doc(db, "conversations", conversationId),
          {
            participantIds,
            updatedAt: now,
            lastMessage: previewText,
            lastReadAt: { [authUser.uid]: now },
            typingAt: { [authUser.uid]: deleteField() },
          },
          { merge: true },
        )
        batch.set(
          doc(collection(db, "messages")),
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
          }),
        )
        await timedWrite(batch.commit())

        const recipient = educators.find((e) => e.id === peerId)
        if (recipient?.email && !isEducatorOnline(recipient.lastActiveAt)) {
          void dispatchOfflineEmailNotification({
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            senderName: currentUser?.name || "A colleague",
            messageSnippet: previewText,
          })
        }

        return null
      } catch (error: any) {
        const msg = String(error?.message || error || "")
        if (msg.includes("longer than") || msg.includes("maximum size") || msg.includes("exceeds the maximum")) {
          return "That attachment is too large to send. Try a smaller file."
        }
        return firebaseErrorMessage(error)
      }
    },
    [authUser, currentUser?.name, educators],
  )

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!authUser) return
      const conversation = conversations.find((item) => item.id === conversationId)
      if (!conversation) return
      const lastRead = conversation.lastReadAt[authUser.uid] ?? ""
      const hasUnread = messages.some(
        (item) => item.conversationId === conversationId && item.senderId !== authUser.uid && item.createdAt > lastRead,
      )
      if (!hasUnread) return
      void updateDoc(doc(getFirebaseDb(), "conversations", conversationId), {
        [`lastReadAt.${authUser.uid}`]: new Date().toISOString(),
      }).catch(() => undefined)
    },
    [authUser, conversations, messages],
  )

  const lastTypingWriteRef = useRef(0)
  const signalTyping = useCallback(
    (peerId: string) => {
      if (!authUser) return
      const now = Date.now()
      if (now - lastTypingWriteRef.current < 4_000) return
      const conversationId = conversationIdFor(authUser.uid, peerId)
      // Only existing conversations: typing must never create an empty thread.
      if (!conversations.some((item) => item.id === conversationId)) return
      lastTypingWriteRef.current = now
      void updateDoc(doc(getFirebaseDb(), "conversations", conversationId), {
        [`typingAt.${authUser.uid}`]: new Date(now).toISOString(),
      }).catch(() => undefined)
    },
    [authUser, conversations],
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
      if (startsAt.getTime() < Date.now() - 5 * 60_000) return "Choose a date and time in the future."
      if (input.format === "in-person") {
        const location = sanitizePlainText(input.location ?? "", 240)
        if (!location) return "Add a venue or address for this in-person meetup."
      }
      if (input.format === "online") {
        const meetingUrl = normalizeMeetingUrl(input.meetingUrl ?? "")
        if (!meetingUrl) return "Add a valid meeting link, e.g. https://meet.google.com/abc-defg-hij"
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
    (id: string) => {
      if (currentUser && currentUser.id === id) return currentUser
      return educators.find((educator) => educator.id === id)
    },
    [currentUser, educators],
  )

  const authorName = useCallback(
    (authorId: string) => educatorLookup(authorId)?.name ?? "Educator",
    [educatorLookup],
  )

  const value = useMemo<AppStore>(
    () => ({
      resetPassword,
      resendVerification,
      emailVerified: Boolean(authUser?.emailVerified),
      educators: visibleEducators,
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
      signalTyping,
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
      visibleEducators,
      resetPassword,
      resendVerification,
      authUser?.emailVerified,
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
      signalTyping,
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
      <div className="grid min-h-dvh place-items-center bg-canvas text-ink">
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
