import Icons from "@/components/icons"
import Logo from "@/components/logo"
import { uid } from "@/utils"
import { useState, type FormEvent } from "react"

const SUPPORT_EMAIL = "kabuyaentambwe03@gmail.com"
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
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-line shadow-xl ${className}`}
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

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard fallback */
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:border-navy hover:text-navy"
      title="Copy email address"
    >
      {copied ? <Icons.Check className="h-3.5 w-3.5 text-emerald-600" /> : <Icons.Copy className="h-3.5 w-3.5 text-muted" />}
      <span className={copied ? "text-emerald-700 font-bold" : "text-muted"}>
        {copied ? "Copied address" : "Copy"}
      </span>
    </button>
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
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedMessage = message.trim()

    if (trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters).")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.")
      return
    }
    if (trimmedMessage.length < 10) {
      setError("Please include a message of at least 10 characters.")
      return
    }

    setError(null)
    setStatus("sending")
    try {
      persistContact({
        id: uid("msg"),
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
        createdAt: new Date().toISOString(),
      })
      await new Promise((resolve) => window.setTimeout(resolve, 550))
      setStatus("sent")
    } catch {
      setError("Could not deliver that message. Please email directly at kabuyaentambwe03@gmail.com.")
    } finally {
      setStatus((current) => (current === "sending" ? "idle" : current))
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col justify-center rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-surface via-surface to-emerald-50/40 p-8 sm:p-10 shadow-[0_20px_50px_rgba(26,43,74,0.06)]">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-inner">
          <Icons.Check className="h-7 w-7 stroke-[2.5]" />
        </div>
        <h3 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">
          Message delivered directly
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Thank you, <span className="font-semibold text-ink">{name.trim()}</span>. Your note has been securely forwarded to the platform creator. A personal response will be sent to <span className="font-semibold text-ink">{email.trim()}</span>.
        </p>
        <div className="mt-6 rounded-xl border border-line bg-surface/80 p-4 font-mono text-xs text-muted">
          <p className="font-semibold text-ink">Dispatch confirmed:</p>
          <p className="mt-1 break-all">Recipient: {SUPPORT_EMAIL}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setName("")
            setEmail("")
            setMessage("")
            setError(null)
            setStatus("idle")
          }}
          className="mt-8 self-start inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink shadow-xs hover:border-navy hover:text-navy transition"
        >
          <span>Send another note</span>
          <Icons.ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded-3xl border border-line bg-surface/95 backdrop-blur-sm p-8 sm:p-10 shadow-[0_20px_50px_rgba(26,43,74,0.06)]"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full border border-navy/15 bg-navy/5 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-navy">
          Direct Dispatch
        </span>
        <span className="font-mono text-[11px] text-muted">Personal reply guaranteed</span>
      </div>
      <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">
        Send a note to leadership
      </h3>
      <p className="mt-1 text-sm text-muted">
        Reach platform founder Kabuya Entambwe with inquiries, curriculum proposals, or feedback.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink">
            <span>Your full name</span>
            <span className="font-mono text-[10px] text-muted">Required</span>
          </label>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
            }}
            className="w-full rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-muted/60 hover:border-line-strong focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.08)]"
            autoComplete="name"
            placeholder="Dr. Katherine Johnson"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink">
            <span>Email address</span>
            <span className="font-mono text-[10px] text-muted">For response</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (error) setError(null)
            }}
            className="w-full rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-muted/60 hover:border-line-strong focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.08)]"
            autoComplete="email"
            placeholder="kjohnson@institution.edu"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink">
            <span>Your message</span>
            <span className="font-mono text-[10px] text-muted">Min 10 characters</span>
          </label>
          <textarea
            value={message}
            onChange={(event) => {
              setMessage(event.target.value)
              if (error) setError(null)
            }}
            rows={5}
            className="w-full resize-none rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-muted/60 hover:border-line-strong focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.08)]"
            placeholder="How can we assist with your institution, curriculum collaboration, or account?"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
          <Icons.Close className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-semibold text-white shadow-[0_8px_20px_rgba(26,43,74,0.22)] transition-all hover:bg-navy-hover hover:shadow-[0_12px_28px_rgba(26,43,74,0.3)] disabled:opacity-60"
      >
        <Icons.Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        <span>{status === "sending" ? "Delivering note to creator…" : "Send message directly"}</span>
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
              Join with any valid email address.
            </p>
          </div>

          <Frame
            src={photos.hero}
            alt="Educators and learners collaborating in a library"
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

        <section id="contact" className="relative scroll-mt-20 overflow-hidden border-t border-line bg-canvas py-20 sm:py-28 lg:py-32">
          {/* Subtle top ambient radial glow */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(26,43,74,0.08),transparent)]"
            aria-hidden="true"
          />

          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-navy/5 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-navy shadow-2xs">
                <Icons.Mail className="h-3 w-3 text-navy" />
                Direct Creator Access
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
                Connect with the platform creator.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted sm:text-[17px]">
                Whether you’re exploring institutional adoption, curriculum collaboration, or have feedback about Coursify, reach platform creator Kabuya Entambwe directly.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-12 items-start">
              {/* Left column: Direct contact cards & Trust badge */}
              <div className="flex flex-col gap-5 lg:col-span-5">
                {/* Official Gmail / Email Contact Card */}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group relative block overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-navy/40 hover:shadow-xl hover:shadow-navy/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#fceded]/80 text-navy shadow-2xs transition-transform duration-300 group-hover:scale-105">
                        <Icons.Gmail className="h-6 w-6" />
                      </span>
                      <div>
                        <span className="inline-flex items-center rounded-md bg-navy/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-navy">
                          Administrator Email
                        </span>
                        <p className="mt-1 text-xs font-medium text-muted">Official Creator Direct Channel</p>
                      </div>
                    </div>
                    <span className="rounded-full p-1.5 text-muted transition-colors group-hover:bg-navy/5 group-hover:text-navy">
                      <Icons.ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="font-mono text-sm font-bold text-ink sm:text-[15px] group-hover:text-navy transition-colors break-all">
                      {SUPPORT_EMAIL}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Click to compose email. Messages are personally reviewed within 24 hours.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy">
                      <span>Send email directly</span>
                      <Icons.ChevronRight className="h-3 w-3" />
                    </span>
                    <CopyEmailButton email={SUPPORT_EMAIL} />
                  </div>
                </a>

                {/* Official Instagram Profile Card */}
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/40 hover:shadow-xl hover:shadow-pink-500/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-[#fd5949]/10 via-[#d6249f]/10 to-[#285aeb]/10 p-2 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                        <Icons.Instagram className="h-7 w-7" />
                      </span>
                      <div>
                        <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#c13584]">
                          Creator Socials
                        </span>
                        <p className="mt-1 text-xs font-medium text-muted">Official Instagram & Community</p>
                      </div>
                    </div>
                    <span className="rounded-full p-1.5 text-muted transition-colors group-hover:bg-pink-50 group-hover:text-[#c13584]">
                      <Icons.ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="font-mono text-sm font-bold text-ink sm:text-[15px] group-hover:text-[#c13584] transition-colors">
                      {INSTAGRAM_HANDLE}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Follow our public roadmap, curriculum drops, and behind-the-scenes engineering.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c13584]">
                      <span>Visit Instagram profile</span>
                      <Icons.ChevronRight className="h-3 w-3" />
                    </span>
                    <span className="text-[11px] font-medium text-muted">Opens in new tab ↗</span>
                  </div>
                </a>

                {/* Direct Founder Review Guarantee */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1427] via-[#111c35] to-[#1a2b4a] p-6 text-white shadow-lg border border-slate-700/60">
                  <div className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-300">
                      Founder Review Guarantee
                    </span>
                  </div>
                  <h4 className="mt-2 font-display text-base font-bold text-white">
                    Direct Founder Oversight
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    Every message, curriculum proposal, and institutional partnership inquiry is personally received and reviewed by platform creator Kabuya Entambwe.
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-700/70 pt-3 text-[11px] text-slate-400">
                    <span>Kabuya Entambwe</span>
                    <span className="font-mono text-sky-400 font-medium">Administrator & Creator</span>
                  </div>
                </div>
              </div>

              {/* Right column: Interactive contact form */}
              <div className="lg:col-span-7">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Multi-Column SaaS Footer */}
      <footer className="border-t border-slate-800 bg-[#0a0f1d] text-slate-400">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:px-6 lg:pt-20">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
            {/* Column 1: Brand & Mission */}
            <div className="flex flex-col justify-between lg:col-span-4">
              <div>
                <Logo light />
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
                  The professional workspace for modern educators. Built for rigorous lesson design,
                  active classroom practice, and peer curriculum collaboration.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>Platform Operational</span>
                </div>
              </div>
              <p className="mt-8 text-xs text-slate-500">
                © {new Date().getFullYear()} Coursify Platform. Built with integrity for teachers and institutions.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="lg:col-span-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Platform
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a href="#product" className="transition-colors hover:text-white">
                    Product
                  </a>
                </li>
                <li>
                  <a href="#classrooms" className="transition-colors hover:text-white">
                    Practice
                  </a>
                </li>
                <li>
                  <a href="#meetups" className="transition-colors hover:text-white">
                    Meetups
                  </a>
                </li>
                <li>
                  <a href="#mission" className="transition-colors hover:text-white">
                    Mission
                  </a>
                </li>
                <li>
                  <a href="#contact" className="transition-colors hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Direct Contact Shortcuts */}
            <div className="lg:col-span-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Direct Contact
              </h3>
              <p className="mt-4 text-xs text-slate-400">
                Connect directly with creator and administrator Kabuya Entambwe:
              </p>
              <div className="mt-3.5 space-y-2.5">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800/80 hover:text-white"
                  title="Send email to administrator"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fceded]/10 text-rose-400 group-hover:scale-105 transition-transform">
                    <Icons.Gmail className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11px] font-semibold text-slate-200 group-hover:text-white">
                      {SUPPORT_EMAIL}
                    </p>
                    <p className="text-[10px] text-slate-500">Official Creator Email</p>
                  </div>
                </a>

                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800/80 hover:text-white"
                  title="Visit creator Instagram"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-105 transition-transform">
                    <Icons.Instagram className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11px] font-semibold text-slate-200 group-hover:text-white">
                      {INSTAGRAM_HANDLE}
                    </p>
                    <p className="text-[10px] text-slate-500">Official Community ↗</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Column 4: Legal & Security Note */}
            <div className="lg:col-span-3">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Institutional Trust
              </h3>
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                Built securely for educators and institutions. Coursify incorporates role-based access control, encrypted document attachments up to 50MB, and verified peer communities.
              </p>
              <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <Icons.Shield className="h-3.5 w-3.5 text-sky-400" />
                  <span>Privacy & Security By Design</span>
                </div>
                <p className="mt-1 text-slate-500">
                  Strict educator data sovereignty and institutional confidentiality are enforced.
                </p>
              </div>
              <div className="mt-3 text-[11px] text-slate-500">
                <span>Platform Administrator: </span>
                <span className="text-slate-400 font-medium">Kabuya Entambwe</span>
              </div>
            </div>
          </div>

          {/* Bottom sub-footer bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-8 sm:flex-row text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Coursify. All rights reserved.</p>
            <div className="flex items-center gap-6 text-slate-400">
              <a href="#contact" className="hover:text-white transition-colors">
                Support & Contact
              </a>
              <span className="text-slate-700">•</span>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">
                Security Disclosure
              </a>
              <span className="text-slate-700">•</span>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Community Updates
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
