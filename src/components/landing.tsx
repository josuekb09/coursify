import Icons from "@/components/icons"
import Logo from "@/components/logo"
import { uid } from "@/utils"
import { useState, type FormEvent } from "react"

const SUPPORT_EMAIL = "coursify.support@gmail.com"
const INSTAGRAM_HANDLE = "@cours.ify"
const INSTAGRAM_URL = "https://www.instagram.com/cours.ify/"
const CONTACT_KEY = "coursify.contact.v1"

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"

const photos = {
  hero: encodeURI("/landing-images/picture 1.jpg"),
  workspace: encodeURI("/landing-images/picture 2.jpg"),
  meetups: encodeURI("/landing-images/picture 3.jpg"),
  mission: encodeURI("/landing-images/picture 4.jpg"),
}

const features = [
  {
    icon: "Upload" as const,
    title: "A shared lesson library",
    body: "Publish plans, slides, and worksheets once. Organize them by subject and grade so colleagues can reuse what already works.",
  },
  {
    icon: "VerifiedSeal" as const,
    title: "A verified teaching profile",
    body: "Your name, school, subjects, and credentials sit on a portable profile that reads as a professional portfolio, not a social feed.",
  },
  {
    icon: "Message" as const,
    title: "Direct faculty collaboration",
    body: "Message colleagues, follow their work, and keep curriculum conversation inside a quiet workspace built for educators.",
  },
]

const classrooms = [
  {
    src: photos.workspace,
    alt: "Educator planning lessons on a laptop at a classroom desk",
    title: "The planning table",
    body: "Lesson design happens at a desk, not in a feed. Keep files, notes, and grade-level collections in one place.",
  },
  {
    src: photos.meetups,
    alt: "Faculty workshop with an educator presenting to colleagues",
    title: "The faculty room",
    body: "Workshops, department huddles, and after-school sessions are easier when the people and the materials are already together.",
  },
]

const meetupPoints = [
  {
    title: "In person",
    body: "Host a department session, add a venue, and let colleagues RSVP from their phones.",
  },
  {
    title: "Online",
    body: "Share a Meet or Zoom link. Educators who are going see the join button when it is time.",
  },
  {
    title: "On the calendar",
    body: "Upcoming, hosting, and going views keep faculty time easy to find without another app.",
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

function Frame({
  src,
  alt,
  className = "",
  imgClassName = "",
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-line shadow-[0_24px_48px_rgba(18,20,28,0.10)] ${className}`}
    >
      {failed ? (
        <div className="h-full min-h-[220px] w-full bg-navy-soft" role="img" aria-label={alt} />
      ) : (
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover ${imgClassName}`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
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
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-7">
        <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">Message sent</h3>
        <p className="mt-2 text-[15px] leading-7 text-muted">
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
          className="mt-5 text-sm font-medium text-navy hover:text-navy-hover"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-surface p-6 sm:p-7">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={field}
          autoComplete="name"
          placeholder="Your name"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Email</span>
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
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"
          placeholder="How can we help?"
        />
      </label>
      {error ? <p className="mt-3 text-sm text-[#8a3b32]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 h-11 w-full rounded-lg bg-navy text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
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
      <header className="sticky top-0 z-20 border-b border-line/90 bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 sm:h-16 sm:px-6">
          <a href="#top" className="shrink-0">
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 text-[13px] font-medium text-muted lg:flex">
            <a href="#product" className="transition-colors hover:text-ink">
              Product
            </a>
            <a href="#classrooms" className="transition-colors hover:text-ink">
              Practice
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
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onSignIn}
              className="min-h-10 rounded-lg px-3 py-2 text-[13px] font-medium text-ink hover:bg-black/[0.04]"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="min-h-10 rounded-lg bg-navy px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover sm:px-4"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <p className="text-[13px] font-medium text-navy">For high school and university educators</p>
            <h1 className="mt-4 max-w-xl font-display text-[2.15rem] font-bold leading-[1.12] tracking-[-0.04em] text-ink sm:text-[2.75rem] lg:text-[3.35rem] lg:leading-[1.08]">
              No teacher should start from a blank page.
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-7 text-muted sm:text-[17px]">
              Coursify is a professional workspace for curriculum. Publish lessons, keep a verified
              profile, and collaborate with colleagues without the noise of a social network.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-hover"
              >
                Create educator account
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:border-line-strong"
              >
                Sign in
              </button>
            </div>
            <p className="mt-5 text-[13px] leading-6 text-muted">
              Join with a school, university, or work email.
            </p>
          </div>

          <Frame
            src={photos.hero}
            alt="Educators collaborating around a table in a bright campus workspace"
            className="aspect-[4/5] w-full sm:aspect-[5/6] lg:aspect-[4/5]"
            eager
          />
        </section>

        <section id="product" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-24">
            <p className="text-[13px] font-medium text-navy">Product</p>
            <h2 className="mt-3 max-w-xl font-display text-[1.75rem] font-bold tracking-[-0.03em] text-ink sm:text-[2rem]">
              Everything a teaching practice needs, without the extra surface area.
            </h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-12">
              {features.map((feature) => {
                const Icon = Icons[feature.icon]
                return (
                  <article key={feature.title}>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-soft text-navy">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-4 font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-7 text-muted">{feature.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="classrooms" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-[13px] font-medium text-navy">Inside the practice</p>
              <h2 className="mt-3 font-display text-[1.75rem] font-bold tracking-[-0.03em] text-ink sm:text-[2rem]">
                Built around the rooms where teaching actually happens.
              </h2>
              <p className="mt-4 max-w-xl text-[16px] leading-7 text-muted">
                From a laptop on a classroom desk to a faculty workshop, Coursify is the professional
                home for educators who already share their best work with each other.
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
              {classrooms.map((item) => (
                <figure key={item.title} className="min-w-0">
                  <Frame src={item.src} alt={item.alt} className="aspect-[4/3]" />
                  <figcaption className="mt-5">
                    <h3 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-7 text-muted">{item.body}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="meetups" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-[13px] font-medium text-navy">Meetups</p>
              <h2 className="mt-3 font-display text-[1.75rem] font-bold tracking-[-0.03em] text-ink sm:text-[2rem]">
                Gather off the feed, then walk into class ready.
              </h2>
              <p className="mt-4 max-w-xl text-[16px] leading-7 text-muted">
                Host in-person sessions with a map, or share a conference link for online faculty time.
                Colleagues RSVP, see who is going, and join when it starts.
              </p>
            </div>
            <div className="mt-12 grid gap-8 border-t border-line pt-10 sm:grid-cols-3 sm:gap-10">
              {meetupPoints.map((item) => (
                <div key={item.title}>
                  <p className="font-display text-[16px] font-semibold tracking-[-0.02em] text-ink">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[14px] leading-7 text-muted">{item.body}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onGetStarted}
              className="mt-10 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-hover"
            >
              Join as an educator
            </button>
          </div>
        </section>

        <section id="mission" className="scroll-mt-20 bg-navy text-white">
          <div className="mx-auto grid max-w-6xl items-stretch lg:grid-cols-2">
            <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-[520px]">
              <img
                src={photos.mission}
                alt="Educator in a classroom with students raising their hands"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex flex-col justify-center px-5 py-16 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
              <p className="text-[13px] font-medium text-white/65">Mission</p>
              <h2 className="mt-3 font-display text-[1.75rem] font-bold tracking-[-0.03em] sm:text-[2rem] sm:leading-[1.15]">
                Teachers should spend their time teaching, not rebuilding materials from scratch.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-7 text-white/75">
                <p>
                  Every term, educators lose hours recreating lessons that already exist in a drawer,
                  a shared drive, or a colleague&apos;s inbox. Coursify closes that gap: a professional
                  home for curriculum that can be published, organized, and reused.
                </p>
                <p>
                  Keep a verified profile with your school, subjects, and credentials. Share collections
                  by grade. Give fellow educators a quiet place to collaborate, so the work of teaching
                  stays on teaching.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-24">
            <div className="max-w-xl">
              <p className="text-[13px] font-medium text-navy">Contact</p>
              <h2 className="mt-3 font-display text-[1.75rem] font-bold tracking-[-0.03em] text-ink sm:text-[2rem]">
                We would like to hear from you.
              </h2>
              <p className="mt-4 text-[16px] leading-7 text-muted">
                Questions, partnerships, or support. Reach the Coursify team directly, or send a
                message below.
              </p>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div className="space-y-6">
                <a href={`mailto:${SUPPORT_EMAIL}`} className="block">
                  <p className="text-[13px] text-muted">Email</p>
                  <p className="mt-1 break-all text-[15px] font-medium text-ink hover:text-navy">
                    {SUPPORT_EMAIL}
                  </p>
                </a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="block">
                  <p className="text-[13px] text-muted">Instagram</p>
                  <p className="mt-1 text-[15px] font-medium text-ink hover:text-navy">{INSTAGRAM_HANDLE}</p>
                </a>
              </div>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
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
