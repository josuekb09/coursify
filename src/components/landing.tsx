import Icons from "@/components/icons"
import { openCookieSettings } from "@/components/cookie-consent"
import Logo, { CoursifyMark } from "@/components/logo"
import { FOUNDER_EMAIL } from "@/security"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"

const SUPPORT_EMAIL = FOUNDER_EMAIL
const INSTAGRAM_HANDLE = "@cours.ify"
const INSTAGRAM_URL = "https://www.instagram.com/cours.ify/"

// Photography from South Africa; sources and licences are listed in public/landing-images/SOURCES.md.
// Each photo ships as a JPEG fallback plus WebP widths for srcset.
type PhotoAsset = { name: string; widths: number[] }
const photos = {
  hero: { name: "hero-science-class", widths: [800, 1400] },
  planning: { name: "classroom-gauteng", widths: [800, 1400, 2000] },
  workshop: { name: "pretoria-assembly", widths: [800, 1400, 2000] },
  mission: { name: "free-state-outdoor-class", widths: [800, 1400, 2000] },
} satisfies Record<string, PhotoAsset>

const nav = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#meetups", label: "Meetups" },
  { href: "#mission", label: "Why Coursify" },
  { href: "#contact", label: "Contact" },
]

const features = [
  {
    icon: Icons.Book,
    title: "A library that thinks in grades and terms",
    body: "Worksheets, slide decks, lesson plans, marking memos and videos, filed by subject and grade. Preview a PowerPoint or a Word document before you download it.",
  },
  {
    icon: Icons.Message,
    title: "The author is one message away",
    body: "Found a Grade 11 Life Sciences practical you like? Ask the teacher who wrote it how it went with their class. Messages, files and voice notes, in real time.",
  },
  {
    icon: Icons.Award,
    title: "A profile that doubles as your portfolio",
    body: "Your school, your subjects and everything you've shared, on one page. Export a CV from it when a post opens up or your HOD asks.",
  },
  {
    icon: Icons.Calendar,
    title: "Meetups that actually get planned",
    body: "Subject clusters, moderation prep, Saturday workshops. Post the details once and see who's coming, in person or online.",
  },
]

const steps = [
  {
    title: "Search before you start",
    body: "Sunday evening, Term 3, Euclidean geometry. Chances are another teacher has already built the worksheet.",
  },
  {
    title: "Adapt it for your class",
    body: "Download the original file, not a flattened copy. Change the examples, keep the structure, save hours.",
  },
  {
    title: "Share what you improve",
    body: "Upload your version with one click. The next teacher starts from your work instead of a blank page.",
  },
]

const formats = ["PDF", "Word", "PowerPoint", "Excel", "Video", "ZIP", "Links"]

/* ─── Small building blocks ──────────────────────────────────────────────────────────── */

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "0px 0px 12% 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "animate-rise" : "opacity-0"}`}
      style={visible && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

function Photo({
  src,
  alt,
  className = "",
  eager = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  src: PhotoAsset
  alt: string
  className?: string
  eager?: boolean
  sizes?: string
}) {
  const base = `/landing-images/${src.name}`
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <div className={`group/photo relative overflow-hidden bg-navy-soft ${className}`}>
      {/* Brand gradient doubles as the loading state and as a fallback if the image is missing. */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${loaded && !failed ? "opacity-0" : "opacity-100"}`}
        style={{ background: "linear-gradient(135deg, #eef1f7 0%, #dfe5f0 50%, #cfd8e8 100%)" }}
        aria-hidden="true"
      />
      {failed ? (
        <div className="absolute inset-0 grid place-items-center" role="img" aria-label={alt}>
          <CoursifyMark className="h-16 w-16 opacity-30" />
        </div>
      ) : (
        <picture>
          <source type="image/webp" srcSet={src.widths.map((w) => `${base}-${w}.webp ${w}w`).join(", ")} sizes={sizes} />
          <img
            src={`${base}.jpg`}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover/photo:scale-[1.03] ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </picture>
      )}
    </div>
  )
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`text-[13px] font-semibold tracking-[0.01em] ${light ? "text-white/60" : "text-navy"}`}>{children}</p>
  )
}

function SectionTitle({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <h2
      className={`mt-3 max-w-2xl font-display text-[1.9rem] font-bold leading-[1.12] tracking-[-0.035em] sm:text-[2.4rem] ${
        light ? "text-white" : "text-ink"
      }`}
    >
      {children}
    </h2>
  )
}

/* ─── Contact ────────────────────────────────────────────────────────────────────────── */

function CopyEmailButton() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async (event) => {
        event.preventDefault()
        event.stopPropagation()
        try {
          await navigator.clipboard.writeText(SUPPORT_EMAIL)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        } catch {
          window.location.href = `mailto:${SUPPORT_EMAIL}`
        }
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12px] font-semibold text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {copied ? <Icons.Check className="h-3.5 w-3.5 text-online" /> : <Icons.Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy address"}
    </button>
  )
}

/**
 * There is no backend to receive form posts, so the form hands the message to the visitor's own
 * email app, pre-filled. Nothing is claimed as "sent" until they send it there.
 */
function ContactForm() {
  const [name, setName] = useState("")
  const [school, setSchool] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [opened, setOpened] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) return setError("Please add your name.")
    if (message.trim().length < 10) return setError("Please write a little more so we can help.")
    setError(null)
    const subject = `Coursify: message from ${name.trim()}${school.trim() ? ` (${school.trim()})` : ""}`
    const body = `${message.trim()}\n\n${name.trim()}${school.trim() ? `\n${school.trim()}` : ""}`
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setOpened(true)
  }

  const input =
    "h-12 w-full rounded-xl border border-line bg-canvas px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-muted/70 focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.10)]"

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_60px_rgba(18,20,28,0.06)] sm:p-8">
      <h3 className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink">Write to us</h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
        Questions, ideas, or bringing Coursify to your whole school. The founder reads every message.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Your name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className={input} placeholder="Nomsa Dlamini" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">
            School <span className="font-normal text-muted">(optional)</span>
          </span>
          <input value={school} onChange={(event) => setSchool(event.target.value)} autoComplete="organization" className={input} placeholder="Hoërskool, college or district" />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink">Message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          className={`${input} h-auto resize-none py-3 leading-relaxed`}
          placeholder="How can we help?"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-[#fbeeec] px-3.5 py-2.5 text-[13px] text-[#8a3b32]">
          <Icons.Alert className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
      {opened ? (
        <p className="animate-fade-in mt-4 flex items-start gap-2 rounded-xl bg-navy-soft px-3.5 py-3 text-[13px] leading-relaxed text-ink">
          <Icons.Mail className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
          <span>
            Your email app should have opened with the message ready. Press send there to reach us. If nothing opened,
            email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-navy underline-offset-2 hover:underline">{SUPPORT_EMAIL}</a> directly.
          </span>
        </p>
      ) : null}
      <button
        type="submit"
        className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy text-[15px] font-semibold text-white transition-colors hover:bg-navy-hover"
      >
        Continue in your email app
        <Icons.ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────────────────── */

export default function Landing({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 ${
          scrolled
            ? "border-line/80 bg-canvas/80 shadow-[0_8px_30px_rgba(18,20,28,0.06)]"
            : "border-transparent bg-canvas/40"
        }`}
      >
        <div className={`mx-auto flex max-w-6xl transition-[height] duration-300 ${scrolled ? "h-14" : "h-16 sm:h-[72px]"} items-center justify-between gap-3 px-5 sm:px-6`}>
          <a href="#top" className="shrink-0" aria-label="Coursify home">
            <Logo />
          </a>
          <nav className="hidden items-center gap-7 text-[14px] font-medium text-muted lg:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="relative py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-navy after:transition-transform hover:text-ink hover:after:scale-x-100"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onSignIn} className="hidden h-10 rounded-xl px-3.5 text-[14px] font-semibold text-ink transition-colors hover:bg-black/[0.04] sm:block">
              Sign in
            </button>
            <button type="button" onClick={onGetStarted} className="h-10 rounded-xl bg-navy px-4 text-[14px] font-semibold text-white transition-colors hover:bg-navy-hover">
              Join Coursify
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-black/[0.04] lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <Icons.Close className="h-5 w-5" /> : <Icons.Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav className="animate-fade-in border-t border-line bg-canvas px-5 pb-4 pt-2 lg:hidden">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex h-12 items-center border-b border-line/70 text-[15px] font-medium text-ink last:border-0"
              >
                {item.label}
              </a>
            ))}
            <button type="button" onClick={onSignIn} className="mt-3 h-11 w-full rounded-xl border border-line text-[14px] font-semibold text-ink sm:hidden">
              Sign in
            </button>
          </nav>
        ) : null}
      </header>

      <main id="top">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(26,43,74,0.14),transparent)]" />
            <div className="absolute -right-32 top-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(47,158,107,0.12),transparent)]" />
            <div className="absolute -bottom-24 left-1/3 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(232,170,66,0.12),transparent)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(18,20,28,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(18,20,28,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
          </div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-14 lg:pb-28 lg:pt-20">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-semibold text-navy">
                <span className="h-1.5 w-1.5 rounded-full bg-online" />
                Made for South African teachers
              </span>
              <h1 className="mt-5 font-display text-[clamp(2.5rem,6vw,4.1rem)] font-bold leading-[1.02] tracking-[-0.045em] text-ink text-balance">
                Your next lesson is{" "}
                <span className="bg-gradient-to-r from-navy via-[#2c4f86] to-[#2f9e6b] bg-clip-text text-transparent">
                  probably already written.
                </span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-[17px] leading-[1.65] text-muted sm:text-[18px]">
                Coursify is where teachers share the CAPS-aligned worksheets, slide decks and lesson plans they already use,
                and where the colleague who made them is one message away. Spend your evenings on your learners, not on
                rebuilding material that exists.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="group inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-navy px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(26,43,74,0.22)] transition-all hover:bg-navy-hover hover:shadow-[0_14px_30px_rgba(26,43,74,0.28)]"
                >
                  Join as a teacher
                  <Icons.ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-xl border border-line bg-surface px-6 text-[15px] font-semibold text-ink transition-colors hover:border-line-strong"
                >
                  Sign in
                </button>
              </div>
              <p className="mt-5 text-[13.5px] text-muted">Takes about two minutes. Works on your phone and your laptop.</p>
            </div>

            <div className="animate-rise relative [animation-delay:120ms]">
              <Photo
                src={photos.hero}
                alt="A science teacher guides learners through an electric circuits practical in a South African classroom"
                className="aspect-[6/5] rounded-[28px] shadow-[0_30px_80px_rgba(18,20,28,0.18)] ring-1 ring-black/5"
                eager
              />
              {/* Illustrative product moments layered over the photo. */}
              <div className="animate-rise absolute -bottom-6 left-4 w-[min(310px,82%)] rounded-2xl border border-line bg-surface/95 p-3.5 shadow-[0_16px_40px_rgba(18,20,28,0.16)] backdrop-blur [animation-delay:420ms] sm:-left-8">
                <div className="flex items-start gap-3">
                  <span className="relative grid h-11 w-10 shrink-0 place-items-center rounded-lg bg-navy-soft text-navy">
                    <Icons.File className="h-5 w-5" />
                    <span className="absolute -bottom-1 rounded bg-navy px-1 font-mono text-[8px] font-bold leading-[13px] text-white">PDF</span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink">Electric circuits practical</p>
                    <p className="truncate text-[12px] text-muted">Physical Sciences · Grade 10</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[12px]">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Icons.Download className="h-3.5 w-3.5" />
                    Download
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
                    <Icons.Bookmark className="h-3.5 w-3.5" />
                    Saved
                  </span>
                </div>
              </div>
              <div className="animate-rise absolute -top-5 right-4 max-w-[240px] rounded-2xl rounded-br-md bg-navy px-3.5 py-2.5 text-[13px] leading-snug text-white shadow-[0_16px_40px_rgba(18,20,28,0.22)] [animation-delay:640ms] sm:-right-6">
                Using your memo with my 10B class tomorrow. Thank you!
                <span className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-white/60">
                  18:42 <Icons.DoubleCheck className="h-3.5 w-3.5 text-[#9cd1ff]" />
                </span>
              </div>
            </div>
          </div>

          <div className="border-y border-line bg-surface/70">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-4 text-[13px] text-muted sm:justify-between sm:px-6">
              <span className="font-semibold text-ink">Share it in the format you made it</span>
              <span className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                {formats.map((format) => (
                  <span key={format} className="inline-flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-line-strong" />
                    {format}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </section>

        {/* ── Product ── */}
        <section id="product" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-28">
            <Reveal>
              <Eyebrow>Product</Eyebrow>
              <SectionTitle>Everything you need to stop planning alone.</SectionTitle>
              <p className="mt-4 max-w-xl text-[16.5px] leading-[1.7] text-muted">
                Coursify isn't another feed to keep up with. It's a working space for the parts of teaching that happen
                outside the classroom.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 80}>
                  <article className="group h-full rounded-3xl border border-line bg-surface p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_24px_50px_rgba(18,20,28,0.08)] sm:p-7">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-soft text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 font-display text-[19px] font-bold leading-snug tracking-[-0.02em] text-ink">{feature.title}</h3>
                    <p className="mt-2.5 text-[15px] leading-[1.7] text-muted">{feature.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <Reveal>
              <Photo
                src={photos.planning}
                alt="A quiet classroom in Gauteng, desks ready before the learners arrive"
                className="aspect-[4/3] rounded-[28px]"
              />
            </Reveal>
            <div>
              <Reveal>
                <Eyebrow>How it works</Eyebrow>
                <SectionTitle>Built for the Sunday-evening lesson plan.</SectionTitle>
              </Reveal>
              <ol className="mt-10 space-y-7">
                {steps.map((step, index) => (
                  <Reveal key={step.title} delay={index * 90}>
                    <li className="flex gap-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-canvas font-display text-[15px] font-bold text-navy">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-display text-[18px] font-bold tracking-[-0.02em] text-ink">{step.title}</h3>
                        <p className="mt-1.5 text-[15px] leading-[1.7] text-muted">{step.body}</p>
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── Meetups ── */}
        <section id="meetups" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-28">
            <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Reveal>
                <Eyebrow>Meetups</Eyebrow>
                <SectionTitle>The best professional development is often the teacher down the road.</SectionTitle>
              </Reveal>
              <Reveal delay={100}>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="group inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-5 text-[14px] font-semibold text-ink transition-colors hover:border-line-strong"
                >
                  Host your first meetup
                  <Icons.ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Reveal>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <Reveal>
                <Photo
                  src={photos.workshop}
                  alt="Learners at Pretoria Boys High School singing together at a school function"
                  className="aspect-[16/10] h-full rounded-[28px] lg:aspect-auto lg:min-h-[420px]"
                />
              </Reveal>
              <div className="grid gap-4">
                <Reveal delay={80}>
                  <div className="h-full rounded-3xl border border-line bg-surface p-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-soft px-2.5 py-1 text-[12px] font-semibold text-navy">
                      <Icons.Pin className="h-3.5 w-3.5" />
                      In person
                    </span>
                    <h3 className="mt-4 font-display text-[18px] font-bold tracking-[-0.02em] text-ink">A venue, a map, a headcount</h3>
                    <p className="mt-2 text-[15px] leading-[1.7] text-muted">
                      Add the school or address and colleagues see it on a map. You'll know who's coming before you put the kettle on.
                    </p>
                  </div>
                </Reveal>
                <Reveal delay={160}>
                  <div className="h-full rounded-3xl border border-line bg-surface p-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3f6] px-2.5 py-1 text-[12px] font-semibold text-[#3a5a6b]">
                      <Icons.Video className="h-3.5 w-3.5" />
                      Online
                    </span>
                    <h3 className="mt-4 font-display text-[18px] font-bold tracking-[-0.02em] text-ink">One link, only for people who RSVP</h3>
                    <p className="mt-2 text-[15px] leading-[1.7] text-muted">
                      Paste a Google Meet, Zoom or Teams link. It's shown to colleagues who said they're coming, with a join button when it's time.
                    </p>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── Mission ── */}
        <section id="mission" className="scroll-mt-20 bg-navy text-white">
          <div className="mx-auto grid max-w-6xl lg:grid-cols-2">
            <div className="relative min-h-[300px] sm:min-h-[400px] lg:min-h-[600px]">
              <div className="absolute inset-0">
                <Photo src={photos.mission} alt="A teacher with young learners under a tree at a rural school in the Free State" className="h-full w-full" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-navy/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-navy/30" aria-hidden="true" />
            </div>
            <div className="flex flex-col justify-center px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
              <Reveal>
                <Eyebrow light>Why Coursify</Eyebrow>
                <SectionTitle light>Good teaching material should travel as far as the teachers who need it.</SectionTitle>
                <div className="mt-7 space-y-5 text-[16px] leading-[1.75] text-white/75">
                  <p>
                    Right now, a brilliant Grade 12 revision pack can sit in one teacher's Google Drive while a colleague two
                    schools away builds the same thing from scratch. That's hours taken from marking, from learners, and from
                    rest.
                  </p>
                  <p>
                    Coursify exists to close that gap. We give South African teachers one professional place to share what
                    works, find what they need, and know the people behind it. It's built by someone who cares about teachers,
                    not by an ad network.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="group mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-navy transition-colors hover:bg-navy-soft"
                >
                  Join the community
                  <Icons.ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="contact" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
              <Reveal>
                <Eyebrow>Contact</Eyebrow>
                <SectionTitle>Talk to a person, not a ticket queue.</SectionTitle>
                <p className="mt-4 max-w-md text-[16.5px] leading-[1.7] text-muted">
                  Coursify is small and independent, so your feedback shapes what we build next. Tell us what would save
                  you time.
                </p>

                <div className="mt-8 space-y-3">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_30px_rgba(18,20,28,0.06)]"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-soft text-navy">
                      <Icons.Gmail className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-muted">Email</span>
                      <span className="block truncate text-[15px] font-semibold text-ink">{SUPPORT_EMAIL}</span>
                    </span>
                    <CopyEmailButton />
                  </a>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_30px_rgba(18,20,28,0.06)]"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-soft text-navy">
                      <Icons.Instagram className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-muted">Instagram</span>
                      <span className="block truncate text-[15px] font-semibold text-ink">{INSTAGRAM_HANDLE}</span>
                    </span>
                    <Icons.ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                  </a>
                </div>
              </Reveal>
              <Reveal delay={100}>
                <ContactForm />
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0d1628] text-white/60">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
            <div>
              <Logo light />
              <p className="mt-4 max-w-xs text-[14.5px] leading-relaxed">
                Where South African teachers share their best material and find the colleagues behind it.
              </p>
              <button
                type="button"
                onClick={onGetStarted}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-semibold text-navy transition-colors hover:bg-navy-soft"
              >
                Join Coursify
              </button>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-white">Explore</h3>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                {nav.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="transition-colors hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-white">Get in touch</h3>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                    <Icons.Mail className="h-4 w-4" />
                    Email us
                  </a>
                </li>
                <li>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                    <Icons.Instagram className="h-4 w-4" />
                    {INSTAGRAM_HANDLE}
                  </a>
                </li>
                <li>
                  <button type="button" onClick={onSignIn} className="inline-flex items-center gap-2 transition-colors hover:text-white">
                    <Icons.ArrowRight className="h-4 w-4" />
                    Sign in
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-[12.5px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p>© {new Date().getFullYear()} Coursify. Built for South African classrooms.</p>
              <p className="text-white/30">Photos taken in South Africa by Thabang Thamano, Vincent Peters, Jørgen Larsen (Pexels) and USAID.</p>
            </div>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1">
              <a href="/privacy" className="hover:text-white">Privacy</a>
              <a href="/terms" className="hover:text-white">Terms</a>
              <a href="/cookies" className="hover:text-white">Cookies</a>
              <button type="button" onClick={openCookieSettings} className="hover:text-white">Cookie settings</button>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}
