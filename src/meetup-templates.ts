import type { EventFormat, MeetupKind } from "@/types"

export type MeetupTemplate = {
  kind: MeetupKind
  name: string
  blurb: string
  title: string
  description: string
  agenda: string[]
  durationMinutes: number
  format: EventFormat
}

/** Starting points for the meetups South African teachers actually run. Everything stays editable. */
export const MEETUP_TEMPLATES: MeetupTemplate[] = [
  {
    kind: "moderation",
    name: "Moderation",
    blurb: "Cross-mark SBA tasks before the district deadline",
    title: "SBA moderation session",
    description: "Bring a sample of marked tasks and your memo. We'll cross-moderate in pairs and agree on marking standards before submission.",
    agenda: ["Welcome and the moderation tool", "Cross-marking in pairs", "Agree on tolerance and common errors", "Sign-off and next steps"],
    durationMinutes: 120,
    format: "in-person",
  },
  {
    kind: "cluster",
    name: "Subject cluster",
    blurb: "Teachers of one subject from nearby schools",
    title: "Subject cluster meeting",
    description: "A regular get-together for teachers of the same subject in our area. Share what's working, swap resources and plan common assessments.",
    agenda: ["Round-table: wins and challenges", "Resource swap", "Common assessment planning", "Date for the next cluster"],
    durationMinutes: 90,
    format: "in-person",
  },
  {
    kind: "planning",
    name: "Term planning",
    blurb: "Map the ATP to weeks and share the work",
    title: "Term planning with the ATP",
    description: "We'll map this term's Annual Teaching Plan to the school calendar and split up who prepares which lessons and worksheets.",
    agenda: ["ATP walkthrough for the term", "Pacing against the school calendar", "Split lesson and worksheet prep", "Where we'll share the files"],
    durationMinutes: 60,
    format: "online",
  },
  {
    kind: "marking",
    name: "Marking marathon",
    blurb: "Mark exam scripts together, with a memo discussion",
    title: "Exam marking marathon",
    description: "Bring your scripts and a red pen. We start with a memo discussion so everyone marks the same way, then mark together. Tea and snacks provided.",
    agenda: ["Memo discussion", "Marking block 1", "Tea break", "Marking block 2", "Capture marks"],
    durationMinutes: 180,
    format: "in-person",
  },
  {
    kind: "mentoring",
    name: "New teacher support",
    blurb: "Experienced teachers help first-years settle in",
    title: "First-year teacher check-in",
    description: "An informal session for teachers in their first years. Ask anything: classroom management, admin, SBA, or how to survive the term.",
    agenda: ["Introductions", "Open questions", "One practical tip each", "Pair up with a mentor"],
    durationMinutes: 45,
    format: "online",
  },
  {
    kind: "workshop",
    name: "Workshop",
    blurb: "One teacher shows a method or a tool",
    title: "Workshop: ",
    description: "A hands-on session where we try a teaching method or tool together, then talk about how to use it in our own classrooms.",
    agenda: ["Demo", "Try it yourself", "Questions and adaptations"],
    durationMinutes: 60,
    format: "online",
  },
  {
    kind: "social",
    name: "Coffee after school",
    blurb: "No agenda, just colleagues",
    title: "Coffee after school",
    description: "No agenda, no slides. Come and meet teachers from schools nearby.",
    agenda: [],
    durationMinutes: 60,
    format: "in-person",
  },
]

export const DURATIONS = [30, 45, 60, 90, 120, 180]

export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest}` : `${hours} h`
}

export function templateFor(kind?: MeetupKind) {
  return MEETUP_TEMPLATES.find((item) => item.kind === kind)
}
