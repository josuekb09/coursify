export type View =
  | "dashboard"
  | "discover"
  | "meetups"
  | "messages"
  | "uploads"
  | "saved"
  | "subjects"
  | "admin"
  | "profile"

export type EventFormat = "in-person" | "online"

export type AuthMode = "login" | "signup"

export type ProfileTab = "Resources" | "Lesson Plans" | "Collections"

export type ResourceKind = "resource" | "lesson-plan" | "collection"

export type ResourceFormat = "video" | "slides" | "document" | "spreadsheet" | "code"

export type InstitutionLevel = "high-school" | "university"

// Subject remains a string to support a teacher's custom curriculum area.
export type Subject = string

export type Educator = {
  id: string
  email: string
  name: string
  initials: string
  school: string
  subject: Subject
  bio: string
  joinedYear: number
  createdAt: string
  storageBytes: number
  verified: boolean
  badgeClaimed?: boolean
  institutionLevel: InstitutionLevel
  photoData?: string
  lastActiveAt?: string
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
  fileUrl?: string
  storagePath?: string
  sourceUrl?: string
  slides?: Slide[]
  createdAt: string
  hasFile?: boolean
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

export type ChatAttachment = {
  url: string
  name: string
  type: string
  size?: string
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: string
  attachmentSize?: string
  status?: "sent" | "delivered" | "read"
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

export type Meetup = {
  id: string
  title: string
  description: string
  hostId: string
  format: EventFormat
  startsAt: string
  location?: string
  meetingUrl?: string
  rsvpIds: string[]
  createdAt: string
}

export type MeetupInput = {
  title: string
  description: string
  format: EventFormat
  startsAt: string
  location?: string
  meetingUrl?: string
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
