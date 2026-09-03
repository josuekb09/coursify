import { pbkdf2 as pbkdf2Cb, randomBytes, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const pbkdf2 = promisify(pbkdf2Cb)

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "inbox.com",
  "mailinator.com",
  "guerrillamail.com",
  "tutanota.com",
  "fastmail.com",
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
  "gymnasium",
  "highschool",
  "secondary",
  "varsity",
  "technik",
  "faculty",
  "k12",
]

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Literature & Language Arts",
  "Computer Science & IT",
  "Economics & Business",
  "Art & Design",
  "Music",
  "Physical Education",
  "Foreign Languages",
]

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g
const TAGS = /<\/?[^>]+>/g

export function sanitizePlainText(value, max = 240) {
  return String(value ?? "")
    .replace(TAGS, " ")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
}

export function normalizeEmail(value) {
  return String(value ?? "")
    .replace(TAGS, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase()
}

export function emailDomain(email) {
  const at = email.lastIndexOf("@")
  if (at < 1) return ""
  return email.slice(at + 1)
}

export function isFreeEmailProvider(email) {
  return FREE_EMAIL_DOMAINS.has(emailDomain(normalizeEmail(email)))
}

export function isInstitutionalEmail(email) {
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

export function professionalEmailError(email) {
  const normalized = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Enter a valid professional email address."
  }
  if (isFreeEmailProvider(normalized)) {
    return "Personal providers such as Gmail, Yahoo, and Outlook are not accepted. Use your school or institutional email."
  }
  if (!isInstitutionalEmail(normalized)) {
    return "Use a high school or university email (.edu, .ac.za, .k12, or your school domain)."
  }
  return null
}

export function inferInstitutionLevel(email, school) {
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

export function isInstitutionLevel(value) {
  return value === "high-school" || value === "university"
}

export function normalizeSubject(value) {
  if (value === "Literature") return "Literature & Language Arts"
  if (SUBJECTS.includes(value)) return value
  return "Mathematics"
}

export function initialsFromName(name) {
  return String(name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`
}

export function conversationIdFor(a, b) {
  return [a, b].sort().join(":")
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64")
}

export async function hashPassword(password, saltB64) {
  const salt = Buffer.from(saltB64, "base64")
  const hash = await pbkdf2(password, salt, 100_000, 32, "sha256")
  return hash.toString("base64")
}

export async function createPasswordRecord(password) {
  const passwordSalt = randomToken(16)
  const passwordHash = await hashPassword(password, passwordSalt)
  return { passwordSalt, passwordHash }
}

export async function passwordsMatch(password, salt, hash) {
  if (!salt || !hash) return false
  const next = await hashPassword(password, salt)
  const left = Buffer.from(next)
  const right = Buffer.from(hash)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function publicEducator(educator) {
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

export function publicResource(resource) {
  return {
    id: resource.id,
    title: resource.title,
    authorId: resource.authorId,
    subject: resource.subject,
    grade: resource.grade,
    type: resource.type,
    kind: resource.kind,
    format: resource.format,
    mimeType: resource.mimeType,
    downloads: resource.downloads,
    saves: resource.saves,
    fileName: resource.fileName,
    fileSize: resource.fileSize,
    fileBytes: resource.fileBytes,
    sourceUrl: resource.sourceUrl,
    createdAt: resource.createdAt,
    hasFile: Boolean(resource.fileData),
  }
}
