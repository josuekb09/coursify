export type View =
  | "dashboard"
  | "discover"
  | "messages"
  | "uploads"
  | "saved"
  | "subjects"
  | "profile"

export type AuthMode = "login" | "signup"

export type ProfileTab = "Resources" | "Lesson Plans" | "Collections"

export type ResourceKind = "resource" | "lesson-plan" | "collection"

export type ResourceFormat = "video" | "slides" | "document" | "spreadsheet" | "code"

export type InstitutionLevel = "high-school" | "university"

export type Subject =
  | "Mathematics"
  | "Physics"
  | "Chemistry"
  | "Biology"
  | "History"
  | "Geography"
  | "Literature & Language Arts"
  | "Computer Science & IT"
  | "Economics & Business"
  | "Art & Design"
  | "Music"
  | "Physical Education"
  | "Foreign Languages"

export type Educator = {
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
}

export type Slide = {
  title: string
  subtitle: string
  bullets: string[]
  imageData?: string
}

export type Resource = {
  id: string
  title: string
  authorId: string
  subject: Subject
  grade: string
  type: string
  kind: ResourceKind
  format: ResourceFormat
  mimeType?: string
  downloads: number
  saves: number
  fileName?: string
  fileSize?: string
  fileBytes?: number
  fileData?: string
  sourceUrl?: string
  slides?: Slide[]
  createdAt: string
}

export type Post = {
  id: string
  authorId: string
  body: string
  resourceId?: string
  createdAt: string
}

export type Conversation = {
  id: string
  participantIds: [string, string]
  updatedAt: string
  lastReadAt: Record<string, string>
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}

export type SignupInput = {
  name: string
  email: string
  school?: string
  subject?: Subject
  bio?: string
  password: string
  institutionLevel: InstitutionLevel
}

export type ProfilePatch = {
  name?: string
  school?: string
  subject?: Subject
  bio?: string
  photoData?: string | null
  institutionLevel?: InstitutionLevel
}

export type UploadInput = {
  title: string
  subject: Subject
  grade: string
  kind: ResourceKind
  format: ResourceFormat
  file?: File | null
  sourceUrl?: string
  slides?: Slide[]
}

export type Toast = {
  id: string
  message: string
}

export type Session = {
  userId: string
  token: string
}
