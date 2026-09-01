import Icons from "@/components/icons"
import Logo, { CoursifyMark } from "@/components/logo"
import { uid } from "@/utils"
import { useState, type FormEvent } from "react"

const SUPPORT_EMAIL = "coursify.support@gmail.com"
const INSTAGRAM_HANDLE = "@cours.ify"
const INSTAGRAM_URL = "https://www.instagram.com/cours.ify/"
const CONTACT_KEY = "coursify.contact.v1"

const field =
  "h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"

const features = [
  {
    icon: "Upload" as const,
    title: "Share Once. Teach for Years.",
    body: "Publish lesson plans, slide decks, and worksheets to a shared library, organized seamlessly by subject and grade level.",
  },
  {
    icon: "VerifiedSeal" as const,
    title: "Verified Professional Profiles.",
    body: "Your name, school, subjects, and credentials live on a portable professional badge that functions as a verified teaching portfolio.",
  },
  {
    icon: "Users" as const,
    title: "Built for Classrooms, Not Feeds.",
    body: "An intentional educator workspace designed purely around curriculum and collaboration. No distractions, just pure educational value.",
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

function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
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
    persistContact({
      id: uid("msg"),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    })
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    setStatus("sent")
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-[0_12px_40px_rgba(18,20,28,0.04)]">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy text-white">
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
      className="rounded-2xl border border-line bg-surface p-6 shadow-[0_12px_40px_rgba(18,20,28,0.04)] sm:p-8"
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
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"
          placeholder="How can we help?"
        />
      </label>
      {error ? <p className="mt-3 text-sm text-[#8a3b32]">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 h-11 w-full rounded-lg bg-navy text-sm font-semibold text-white shadow-[0_8px_20px_rgba(26,43,74,0.2)] hover:bg-navy-hover disabled:opacity-60"
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
    <div className="min-h-full bg-[#f5f5f5] text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-[#f5f5f5]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-6 sm:px-6">
          <a href="#top" className="shrink-0">
            <Logo />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
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
              className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-black/[0.04]"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="min-h-10 rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(26,43,74,0.22)] transition-colors hover:bg-navy-hover sm:px-4"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(26,43,74,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,43,74,0.05) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-24 -top-28 hidden h-[420px] w-[420px] opacity-[0.07] lg:block"
            aria-hidden="true"
          >
            <CoursifyMark className="h-full w-full [&_path]:!fill-[var(--color-navy)]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-28 lg:pt-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              For educators
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-[2rem] font-bold leading-[1.08] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[56px]">
              No teacher should ever have to start from a blank page.
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[17px]">
              Coursify is the professional workspace built for educators. Publish your
              curriculum materials, maintain a verified teaching profile with your
              credentials, and collaborate across schools without the noise of a social feed.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGetStarted}
                className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(26,43,74,0.24)] transition-colors hover:bg-navy-hover"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink shadow-[0_8px_24px_rgba(18,20,28,0.04)] transition-colors hover:border-line-strong"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Platform
            </p>
            <h2 className="mt-3 max-w-xl font-display text-2xl font-bold tracking-[-0.03em] text-ink lg:text-[28px]">
              Everything a modern teaching practice needs, in one workspace.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = Icons[feature.icon]
                return (
                  <article
                    key={feature.title}
                    className="rounded-2xl border border-line bg-surface p-6 shadow-[0_12px_40px_rgba(18,20,28,0.04)]"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{feature.body}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="mission" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-24">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Mission
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] text-ink lg:text-[32px] lg:leading-[1.15]">
                Teachers should spend their time teaching, not rebuilding materials from scratch.
              </h2>
            </div>
            <div className="space-y-5 text-[15px] leading-relaxed text-muted lg:text-[16px]">
              <p>
                Every term, educators lose hours recreating lessons that already exist in a
                drawer, a shared drive, or a message from a colleague. Coursify was built to
                close that gap: a professional home for curriculum where what you have designed
                can be published, organized, and reused.
              </p>
              <p>
                Maintain a verified teaching profile with your school, subjects, and
                credentials. Share lesson plans and collections by grade and subject. Give
                fellow educators a quiet, focused place to collaborate, so the work of
                teaching stays on teaching.
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 border-t border-line bg-surface/60">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
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

            <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3">
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-white">
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
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy text-white">
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

      <footer className="border-t border-line">
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
