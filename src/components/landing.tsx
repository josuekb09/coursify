import Icons from "@/components/icons"
import Logo, { CoursifyMark } from "@/components/logo"
import { uid } from "@/utils"
import { useState, type FormEvent } from "react"

const SUPPORT_EMAIL = "coursify.support@gmail.com"
const INSTAGRAM_HANDLE = "@cours.ify"
const INSTAGRAM_URL = "https://www.instagram.com/cours.ify/"
const CONTACT_KEY = "coursify.contact.v1"

const field =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"

const photos = {
  hero: encodeURI("/landing-images/picture 1.jpg"),
  workspace: encodeURI("/landing-images/picture 2.jpg"),
  meetups: encodeURI("/landing-images/picture 3.jpg"),
  mission: encodeURI("/landing-images/picture 4.jpg"),
}

const features = [
  {
    icon: "Upload" as const,
    title: "Share once. Teach for years.",
    body: "Publish lesson plans, slide decks, and worksheets to a shared library, organized by subject and grade.",
    image: photos.workspace,
    alt: "Educators collaborating on curriculum in a digital workspace",
  },
  {
    icon: "VerifiedSeal" as const,
    title: "Verified professional profiles.",
    body: "Your name, school, subjects, and credentials live on a portable badge that works as a teaching portfolio.",
    image: photos.hero,
    alt: "Teachers working together in a classroom setting",
  },
  {
    icon: "Users" as const,
    title: "Built for classrooms, not feeds.",
    body: "A quiet educator workspace around curriculum and collaboration. No noise, just teaching practice.",
    image: photos.mission,
    alt: "Educator community gathered for teaching and learning",
  },
]

const gallery = [
  {
    src: photos.hero,
    alt: "Collaborative teaching in a modern classroom",
    caption: "Collaborative teaching",
    className: "md:col-span-2 md:row-span-2 min-h-[280px] md:min-h-[420px]",
  },
  {
    src: photos.workspace,
    alt: "Digital educator workspace and lesson planning",
    caption: "Digital workspace",
    className: "min-h-[200px]",
  },
  {
    src: photos.meetups,
    alt: "Faculty workshop and professional meetup",
    caption: "Workshops & events",
    className: "min-h-[200px]",
  },
  {
    src: photos.mission,
    alt: "Educator community making an impact together",
    caption: "Community impact",
    className: "md:col-span-2 min-h-[220px]",
  },
]

const meetups = [
  {
    icon: "Pin" as const,
    title: "In person",
    body: "Host a department huddle, map the venue, and let colleagues RSVP from their phones.",
  },
  {
    icon: "Film" as const,
    title: "Online",
    body: "Share a Meet or Zoom link. Going educators see the join button when they RSVP.",
  },
  {
    icon: "Calendar" as const,
    title: "On the calendar",
    body: "Upcoming, hosting, and going views keep faculty sessions easy to find.",
  },
]

type ContactRecord = {
  id: string
  name: string
  email: string
  message: string
  createdAt: string
}

function persistContact(record: ContactRecord) {
  try {
    const raw = localStorage.getItem(CONTACT_KEY)
    const existing = raw ? (JSON.parse(raw) as ContactRecord[]) : []
    const next = Array.isArray(existing) ? existing : []
    localStorage.setItem(CONTACT_KEY, JSON.stringify([record, ...next]))
  } catch {
    /* Storage may be unavailable; the UI still confirms submission. */
  }
}

function Photo({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className={`h-full w-full rounded-2xl border border-slate-200 bg-navy-soft shadow-xl ${className}`}
        role="img"
        aria-label={alt}
      />
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full rounded-2xl border border-slate-200 object-cover shadow-xl transition-transform duration-700 group-hover:scale-[1.04] ${className}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (status === "sending") return
    if (!name.trim()) {
      setError("Please enter your name.")
      return
    }
    if (!email.trim().includes("@")) {
      setError("Please enter a valid email.")
      return
    }
    if (!message.trim()) {
      setError("Please include a short message.")
      return
    }

    setError(null)
    setStatus("sending")
    try {
      persistContact({
        id: uid("msg"),
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        createdAt: new Date().toISOString(),
      })
      await new Promise((resolve) => window.setTimeout(resolve, 450))
      setStatus("sent")
    } catch {
      setError("Could not send that message. Please try again.")
    } finally {
      setStatus((current) => (current === "sending" ? "idle" : current))
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-[0_20px_50px_rgba(18,20,28,0.08)]">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-white">
          <Icons.Check className="h-5 w-5" />
        </span>
        <h3 className="mt-4 font-display text-lg font-bold tracking-[-0.02em] text-ink">
          Message sent
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Thank you, {name.trim()}. We received your note and will reply at {email.trim()}.
        </p>
        <button
          type="button"
          onClick={() => {
            setName("")
            setEmail("")
            setMessage("")
            setStatus("idle")
          }}
          className="mt-6 text-sm font-medium text-navy hover:text-navy-hover"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-surface p-6 shadow-[0_20px_50px_rgba(18,20,28,0.08)] sm:p-8"
    >
      <label className="block">
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Name
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={field}
          autoComplete="name"
          placeholder="Your name"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={field}
          autoComplete="email"
          placeholder="you@school.edu"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Message
        </span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"
          placeholder="How can we help?"
        />
      </label>
      {error ? <p className="mt-3 text-sm text-[#8a3b32]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 h-11 w-full rounded-xl bg-navy text-sm font-semibold text-white shadow-[0_8px_20px_rgba(26,43,74,0.2)] hover:bg-navy-hover disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
    </form>
  )
}

export default function Landing({
  onSignIn,
  onGetStarted,
}: {
  onSignIn: () => void
  onGetStarted: () => void
}) {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-6 sm:px-6">
          <a href="#top" className="shrink-0">
            <Logo />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted lg:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#classrooms" className="transition-colors hover:text-ink">
              Classrooms
            </a>
            <a href="#meetups" className="transition-colors hover:text-ink">
              Meetups
            </a>
            <a href="#mission" className="transition-colors hover:text-ink">
              Mission
            </a>
            <a href="#contact" className="transition-colors hover:text-ink">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-10 rounded-xl px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-black/[0.04]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="min-h-10 rounded-xl bg-navy px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(26,43,74,0.22)] transition-colors hover:bg-navy-hover sm:px-4"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 420px at 12% -10%, rgba(26,43,74,0.08), transparent 60%), radial-gradient(700px 380px at 100% 10%, rgba(201,162,116,0.18), transparent 55%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24 lg:pt-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-navy shadow-[0_8px_24px_rgba(18,20,28,0.04)]">
                <span className="h-1.5 w-1.5 rounded-full bg-navy" />
                For high school & university educators
              </p>
              <h1 className="mt-5 max-w-xl font-display text-[2.05rem] font-bold leading-[1.08] tracking-[-0.045em] text-ink sm:text-5xl lg:text-[54px]">
                No teacher should ever have to start from a blank page.
              </h1>
              <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-muted sm:text-[17px]">
                Coursify is the professional workspace for educators. Publish curriculum,
                keep a verified teaching profile, and meet colleagues across schools without
                the noise of a social feed.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(26,43,74,0.28)] transition-colors hover:bg-navy-hover"
                >
                  Create educator account
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink shadow-[0_8px_24px_rgba(18,20,28,0.05)] transition-colors hover:border-line-strong"
                >
                  Sign In
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Lesson library", "Verified profiles", "Direct messages", "Faculty meetups"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-surface px-3 py-1 text-[12px] font-medium text-muted"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-[1.35fr_0.85fr] gap-3">
                <div className="group relative overflow-hidden rounded-3xl shadow-[0_28px_70px_rgba(18,20,28,0.16)]">
                  <div className="aspect-[4/5] sm:aspect-[5/6]">
                    <Photo
                      src={photos.hero}
                      alt="Teacher standing with students in a lively classroom, hands raised"
                      eager
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/55 via-transparent to-transparent" />
                  <p className="absolute bottom-4 left-4 right-4 font-display text-[15px] font-semibold leading-snug text-white">
                    Real classrooms. Shared practice.
                  </p>
                </div>
                <div className="flex h-full flex-col gap-3">
                  <div className="group relative min-h-0 flex-1 overflow-hidden rounded-3xl shadow-[0_18px_40px_rgba(18,20,28,0.12)]">
                    <Photo
                      src={photos.workspace}
                      alt="Educators collaborating in a digital teaching workspace"
                      eager
                    />
                  </div>
                  <div className="group relative min-h-0 flex-1 overflow-hidden rounded-3xl shadow-[0_18px_40px_rgba(18,20,28,0.12)]">
                    <Photo
                      src={photos.meetups}
                      alt="Faculty gathering for a teaching workshop"
                    />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 left-4 right-8 hidden rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_16px_40px_rgba(18,20,28,0.12)] backdrop-blur sm:flex sm:items-center sm:gap-3 lg:left-8">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white">
                  <Icons.VerifiedSeal className="h-5 w-5" />
                </span>
                <p className="text-[13px] leading-snug text-ink">
                  <span className="font-semibold">Institutional emails only.</span>
                  <span className="text-muted"> Built for schools and universities, not public social media.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="classrooms" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Inside the practice
              </p>
              <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-ink lg:text-[32px]">
                Built around the rooms where teaching actually happens.
              </h2>
              <p className="text-[15px] leading-relaxed text-muted">
                From lecture halls to planning tables, Coursify is the professional home
                for educators who already share their best work with each other.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-4 md:grid-rows-2">
              {gallery.map((item) => (
                <figure
                  key={item.caption}
                  className={`group relative overflow-hidden rounded-3xl shadow-[0_16px_40px_rgba(18,20,28,0.08)] ${item.className}`}
                >
                  <Photo src={item.src} alt={item.alt} className="transition-transform duration-700 group-hover:scale-[1.04]" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/75 to-transparent px-4 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white">
                    {item.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-line bg-gradient-to-b from-transparent to-navy-soft/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Platform
            </p>
            <h2 className="mt-3 max-w-xl font-display text-2xl font-bold tracking-[-0.03em] text-ink lg:text-[28px]">
              Everything a modern teaching practice needs, in one workspace.
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = Icons[feature.icon]
                return (
                  <article
                    key={feature.title}
                    className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_16px_44px_rgba(18,20,28,0.06)]"
                  >
                    <div className="h-44 overflow-hidden">
                      <Photo src={feature.image} alt={feature.alt} />
                    </div>
                    <div className="p-6">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-muted">{feature.body}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="meetups" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-24">
            <div className="relative">
              <div className="group overflow-hidden rounded-3xl shadow-[0_28px_70px_rgba(18,20,28,0.14)]">
                <div className="aspect-[5/4]">
                  <Photo
                    src={photos.meetups}
                    alt="Educators in a collaborative workshop and meetup"
                  />
                </div>
              </div>
              <div className="absolute -bottom-6 -right-2 max-w-[260px] rounded-2xl border border-line bg-surface p-4 shadow-[0_16px_40px_rgba(18,20,28,0.12)] sm:right-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-navy">Tonight · Faculty lounge</p>
                <p className="mt-1.5 font-display text-[15px] font-semibold text-ink">Curriculum planning circle</p>
                <p className="mt-1 text-[12px] text-muted">RSVP from Meetups. Join in person or online.</p>
              </div>
            </div>
            <div className="lg:pl-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Meetups</p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] text-ink lg:text-[32px] lg:leading-[1.15]">
                Gather off the feed. Plan together, then walk into class ready.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted">
                Host in-person sessions with a map, or share a conference link for online
                faculty time. Colleagues RSVP, see who is going, and join when it is time.
              </p>
              <div className="mt-7 space-y-4">
                {meetups.map((item) => {
                  const Icon = Icons[item.icon]
                  return (
                    <div key={item.title} className="flex gap-3">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-soft text-navy">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold text-ink">{item.title}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{item.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={onGetStarted}
                className="mt-8 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(26,43,74,0.22)] hover:bg-navy-hover"
              >
                Join as an educator
              </button>
            </div>
          </div>
        </section>

        <section id="mission" className="scroll-mt-20 overflow-hidden border-t border-line bg-navy text-white">
          <div className="mx-auto grid max-w-6xl items-stretch lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[280px] lg:min-h-[520px]">
              <Photo
                src={photos.mission}
                alt="Educator community making an impact in teaching and learning"
                className="absolute inset-0 h-full w-full"
              />
              <div className="absolute inset-0 bg-navy/25" />
            </div>
            <div className="relative flex flex-col justify-center px-6 py-16 sm:px-10 lg:py-24">
              <div
                className="pointer-events-none absolute -right-10 -top-8 hidden h-56 w-56 opacity-[0.08] lg:block"
                aria-hidden="true"
              >
                <CoursifyMark className="h-full w-full [&_path]:!fill-white" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
                Mission
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] lg:text-[32px] lg:leading-[1.15]">
                Teachers should spend their time teaching, not rebuilding materials from scratch.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-white/75">
                <p>
                  Every term, educators lose hours recreating lessons that already exist in a
                  drawer, a shared drive, or a message from a colleague. Coursify closes that
                  gap: a professional home for curriculum that can be published, organized, and reused.
                </p>
                <p>
                  Maintain a verified profile with your school, subjects, and credentials. Share
                  collections by grade. Give fellow educators a quiet place to collaborate, so the
                  work of teaching stays on teaching.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 border-t border-line bg-surface/70">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  Contact Us
                </p>
                <h2 className="mt-3 max-w-xl font-display text-2xl font-bold tracking-[-0.03em] text-ink lg:text-[28px]">
                  We would like to hear from you.
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                  Questions, partnerships, or support. Reach the Coursify team directly or send
                  a message below.
                </p>
              </div>
              <div className="hidden overflow-hidden rounded-3xl shadow-[0_16px_40px_rgba(18,20,28,0.08)] lg:block">
                <div className="group h-36">
                  <Photo
                    src={photos.mission}
                    alt="Warm teaching community and classroom impact"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[0_10px_30px_rgba(18,20,28,0.04)] transition-colors hover:border-line-strong"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white">
                    <Icons.Mail className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                      Email
                    </span>
                    <span className="mt-0.5 block break-all text-sm font-semibold text-ink">
                      {SUPPORT_EMAIL}
                    </span>
                  </span>
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-[0_10px_30px_rgba(18,20,28,0.04)] transition-colors hover:border-line-strong"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-white">
                    <Icons.Instagram className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                      Instagram
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold text-ink">
                      {INSTAGRAM_HANDLE}
                    </span>
                  </span>
                </a>
              </div>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink">
              {SUPPORT_EMAIL}
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-ink">
              {INSTAGRAM_HANDLE}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
