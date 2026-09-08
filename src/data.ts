import type { Subject } from "@/types"

export const STORAGE_CAP_BYTES = 10_000_000_000
// Keep this aligned with the Firebase Storage rule. 50 MiB is large enough for
// classroom PDFs and slide decks without permitting unbounded uploads.
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export const nav = [
  { label: "Feed" as const, view: "dashboard" as const, icon: "Grid" as const },
  { label: "Discover" as const, view: "discover" as const, icon: "Users" as const },
  { label: "Meetups" as const, view: "meetups" as const, icon: "Calendar" as const },
  { label: "Messages" as const, view: "messages" as const, icon: "Message" as const },
  { label: "My Uploads" as const, view: "uploads" as const, icon: "Upload" as const },
  { label: "Saved" as const, view: "saved" as const, icon: "Bookmark" as const },
  { label: "Subjects" as const, view: "subjects" as const, icon: "Layers" as const },
  { label: "Admin analytics" as const, view: "admin" as const, icon: "Trend" as const },
]

export const subjectOptions: Subject[] = [
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
  "Accounting",
  "Agricultural Sciences",
  "Anthropology",
  "Architecture",
  "Astronomy",
  "Business Studies",
  "Civics & Social Studies",
  "Communication & Media Studies",
  "Computer Engineering",
  "Creative Writing",
  "Drama & Theatre",
  "Earth & Environmental Science",
  "Engineering",
  "Film Studies",
  "Health Sciences",
  "Law",
  "Library & Information Science",
  "Linguistics",
  "Marketing",
  "Medicine & Nursing",
  "Philosophy",
  "Political Science",
  "Psychology",
  "Religious Studies",
  "Sociology",
  "Statistics",
  "Technology & Design",
]

export const subjects = ["All", ...subjectOptions] as const

export function isSubject(value: string): value is Subject {
  return subjectOptions.includes(value as Subject)
}

export function normalizeSubject(value: string): Subject {
  const subject = value.replace(/\s+/g, " ").trim().slice(0, 100)
  if (value === "Literature") return "Literature & Language Arts"
  return subject || "Mathematics"
}

export const grades = [
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Grades 9–12",
  "Grades 11–12",
  "Grade 4–6",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Undergraduate",
  "Graduate",
  "Postgraduate",
]

export const institutionLabels: Record<"high-school" | "university", string> = {
  "high-school": "High school",
  university: "University",
}

export const subjectTint: Record<string, string> = {
  Mathematics: "bg-navy-soft text-navy",
  Physics: "bg-[#eef0f5] text-[#3a4a6b]",
  Chemistry: "bg-[#f3eef0] text-[#6b3a48]",
  Biology: "bg-[#eaf3ee] text-[#2f6b4b]",
  History: "bg-[#f4efe8] text-[#8a5a2b]",
  Geography: "bg-[#eaf2f1] text-[#2f5f5a]",
  "Literature & Language Arts": "bg-[#f3eef4] text-[#6b3a63]",
  "Computer Science & IT": "bg-[#eef1f8] text-[#2f4a7a]",
  "Economics & Business": "bg-[#f4f0e6] text-[#6b5a2b]",
  "Art & Design": "bg-[#f6eee8] text-[#8a4a32]",
  Music: "bg-[#f0eef6] text-[#4a3a6b]",
  "Physical Education": "bg-[#eaf4ee] text-[#2f6b4b]",
  "Foreign Languages": "bg-[#eef3f6] text-[#3a5a6b]",
}

export const profileTabs = ["Resources", "Lesson Plans", "Collections"] as const
