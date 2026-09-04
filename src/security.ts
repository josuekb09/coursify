import type { InstitutionLevel, Subject } from "@/types"
import { isSubject, normalizeSubject } from "@/data"
import { initialsFromName } from "@/utils"

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "yahoo.ca",
  "yahoo.com.au",
  "yahoo.co.za",
  "ymail.com",
  "outlook.com",
  "outlook.fr",
  "outlook.de",
  "outlook.es",
  "outlook.it",
  "outlook.co.uk",
  "hotmail.com",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.es",
  "hotmail.it",
  "hotmail.co.uk",
  "live.com",
  "live.fr",
  "live.co.uk",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "protonmail.ch",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "gmx.fr",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "inbox.com",
  "mail.ru",
  "mailinator.com",
  "guerrillamail.com",
  "tutanota.com",
  "tuta.io",
  "fastmail.com",
  "hey.com",
  "qq.com",
  "163.com",
  "126.com",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sky.com",
  "btinternet.com",
])

const INSTITUTIONAL_HINTS = [
  "school",
  "college",
  "university",
  "universite",
  "universidad",
  "institute",
  "institut",
  "academy",
  "academie",
  "campus",
  "polytechnic",
  "seminary",
  "lycee",
  "lycée",
  "gymnasium",
  "highschool",
  "secondary",
  "varsity",
  "technik",
  "faculty",
  "k12",
]

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g
const TAGS = /<\/?[^>]+>/g

export function sanitizePlainText(value: string, max = 240) {
  return value.replace(TAGS, " ").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, max)
}

export function normalizeEmail(value: string) {
  return value.replace(TAGS, "").replace(/\s+/g, "").trim().toLowerCase()
}

export function emailDomain(email: string) {
  const at = email.lastIndexOf("@")
  if (at < 1) return ""
  return email.slice(at + 1)
}

export function isFreeEmailProvider(email: string) {
  const domain = emailDomain(normalizeEmail(email))
  return FREE_EMAIL_DOMAINS.has(domain)
}

export function isInstitutionalEmail(email: string) {
  const normalized = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return false
  if (isFreeEmailProvider(normalized)) return false

  const domain = emailDomain(normalized)
  if (!domain || domain.startsWith(".") || domain.endsWith(".")) return false

  if (domain.endsWith(".edu") || domain.includes(".edu.")) return true
  if (/\.ac\.[a-z]{2,}$/i.test(domain) || domain.endsWith(".ac")) return true
  if (domain.includes(".k12.") || domain.endsWith(".k12.us")) return true
  if (domain.includes(".sch.") || /\.sch\.[a-z]{2,}$/i.test(domain)) return true
  if (domain.endsWith(".gov") || domain.includes(".gov.")) return true
  if (domain.includes(".uni.") || domain.startsWith("uni.") || domain.includes("university")) return true

  const compact = domain.replace(/[^a-z0-9]/gi, "").toLowerCase()
  return INSTITUTIONAL_HINTS.some((hint) => compact.includes(hint.replace("é", "e")))
}

export function inferInstitutionLevel(email: string, school: string): InstitutionLevel {
  const domain = emailDomain(normalizeEmail(email))
  const hay = `${domain} ${school}`.toLowerCase()
  if (
    domain.includes(".k12.") ||
    /\.sch\./.test(domain) ||
    /high school|secondary|lycee|lycée|gymnasium|collegiate/.test(hay)
  ) {
    return "high-school"
  }
  if (
    domain.includes(".edu") ||
    /\.ac\./.test(domain) ||
    /university|universite|universidad|college|institute|polytechnic|faculty/.test(hay)
  ) {
    return "university"
  }
  return "high-school"
}

export function isInstitutionLevel(value: unknown): value is InstitutionLevel {
  return value === "high-school" || value === "university"
}

export function professionalEmailError(email: string): string | null {
  const normalized = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Enter a valid professional email address."
  }
  if (isFreeEmailProvider(normalized)) {
    return "Personal providers such as Gmail, Yahoo, and Outlook are not accepted. Use your school, university, or work email."
  }
  return null
}

function bytesToB64(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ""
  view.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function b64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function randomToken(bytes = 32) {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return bytesToB64(buffer)
}

export async function hashPassword(password: string, saltB64: string) {
  const salt = b64ToBytes(saltB64)
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    material,
    256,
  )
  return bytesToB64(bits)
}

export async function createPasswordRecord(password: string) {
  const salt = randomToken(16)
  const hash = await hashPassword(password, salt)
  return { passwordSalt: salt, passwordHash: hash }
}

export async function passwordsMatch(
  password: string,
  salt: string | undefined,
  hash: string | undefined,
  legacy?: string,
) {
  if (salt && hash) {
    const next = await hashPassword(password, salt)
    return next === hash
  }
  return Boolean(legacy) && legacy === password
}

export type PersistedEducator = {
  id: string
  email: string
  passwordHash: string
  passwordSalt: string
  password?: string
  name: string
  initials: string
  school: string
  subject: Subject
  bio: string
  joinedYear: number
  storageBytes: number
  verified: boolean
  institutionLevel: InstitutionLevel
  photoData?: string
  sessionToken: string
}

export function sanitizeEducator(raw: Partial<PersistedEducator> & { id?: string }): PersistedEducator | null {
  if (!raw.id || typeof raw.email !== "string") return null
  const email = normalizeEmail(raw.email)
  if (!email.includes("@")) return null
  const name = sanitizePlainText(String(raw.name ?? ""), 80)
  if (!name) return null
  const subject = isSubject(String(raw.subject ?? ""))
    ? (raw.subject as Subject)
    : normalizeSubject(String(raw.subject ?? "Mathematics"))

  const photo =
    typeof raw.photoData === "string" && raw.photoData.startsWith("data:image/")
      ? raw.photoData.slice(0, 900_000)
      : undefined

  return {
    id: String(raw.id).slice(0, 80),
    email,
    passwordHash: typeof raw.passwordHash === "string" ? raw.passwordHash : "",
    passwordSalt: typeof raw.passwordSalt === "string" ? raw.passwordSalt : "",
    password: typeof raw.password === "string" ? raw.password : undefined,
    name,
    initials: initialsFromName(name),
    school: sanitizePlainText(String(raw.school ?? ""), 120) || "Institution",
    subject,
    bio: sanitizePlainText(String(raw.bio ?? ""), 800),
    joinedYear:
      typeof raw.joinedYear === "number" && raw.joinedYear > 1990
        ? raw.joinedYear
        : new Date().getFullYear(),
    storageBytes: Math.max(0, Number(raw.storageBytes) || 0),
    verified: raw.verified === true || isInstitutionalEmail(email),
    institutionLevel: isInstitutionLevel(raw.institutionLevel)
      ? raw.institutionLevel
      : inferInstitutionLevel(email, sanitizePlainText(String(raw.school ?? ""), 120)),
    photoData: photo,
    sessionToken: typeof raw.sessionToken === "string" ? raw.sessionToken : "",
  }
}

export function publicEducator(educator: PersistedEducator): {
  id: string
  email: string
  name: string
  initials: string
  school: string
  subject: Subject
  bio: string
  joinedYear: number
  storageBytes: number
  verified: boolean
  institutionLevel: InstitutionLevel
  photoData?: string
} {
  return {
    id: educator.id,
    email: educator.email,
    name: educator.name,
    initials: educator.initials,
    school: educator.school,
    subject: educator.subject,
    bio: educator.bio,
    joinedYear: educator.joinedYear,
    storageBytes: educator.storageBytes,
    verified: educator.verified,
    institutionLevel: educator.institutionLevel,
    photoData: educator.photoData,
  }
}
