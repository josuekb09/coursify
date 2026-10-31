import Logo from "@/components/logo"
import { openCookieSettings } from "@/components/cookie-consent"
import { FOUNDER_EMAIL } from "@/security"
import { useEffect, type ReactNode } from "react"

export type LegalDoc = "privacy" | "terms" | "cookies"

const UPDATED = "31 October 2026"
const CONTACT = FOUNDER_EMAIL
const OPERATOR = "Josue Kabuya, trading as Coursify"

export function legalDocFromPath(pathname: string): LegalDoc | null {
  const path = pathname.replace(/\/+$/, "").toLowerCase()
  if (path === "/privacy") return "privacy"
  if (path === "/terms") return "terms"
  if (path === "/cookies") return "cookies"
  return null
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-ink sm:text-[22px]">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/80 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  )
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="font-semibold text-navy underline">
      {CONTACT}
    </a>
  )
}

function Privacy() {
  return (
    <>
      <p>
        This policy explains what personal information Coursify collects, why, and the choices you have. We process
        personal information in line with South Africa's Protection of Personal Information Act, 2013 (POPIA).
      </p>
      <Section title="1. Who is responsible">
        <p>
          The responsible party is {OPERATOR}. For any privacy question or request, write to <Mail />. This address
          also reaches our Information Officer.
        </p>
      </Section>
      <Section title="2. What we collect">
        <ul>
          <li>Account details: your name, email address and password (stored only as a secure hash by Google Firebase Authentication).</li>
          <li>Profile details you choose to add: school, subjects, institution type, bio and photo.</li>
          <li>
            If you ask to be verified as a teacher: your SACE registration number and school. Only you and the Coursify
            team can see them; we use them solely to check the public SACE register.
          </li>
          <li>Content you share: resources, posts, meetups, and the files attached to them.</li>
          <li>Messages, attachments and voice notes you send to other educators.</li>
          <li>Activity needed to run the service: follows, saves, RSVPs, download counts and the time you were last active.</li>
        </ul>
        <p>We do not collect identity numbers, banking details or special personal information, and we do not sell personal information.</p>
      </Section>
      <Section title="3. Why we use it">
        <ul>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To show your profile and shared resources to other signed-in educators.</li>
          <li>To deliver messages and meetup updates.</li>
          <li>To prevent abuse, investigate security incidents and meet legal obligations.</li>
        </ul>
        <p>
          The lawful bases are the agreement between you and Coursify (our Terms of Use), our legitimate interest in
          running a safe service, and your consent where we ask for it.
        </p>
      </Section>
      <Section title="4. Who can see it">
        <ul>
          <li>Your name, school, subjects, bio, photo and shared resources are visible to other signed-in members.</li>
          <li>Your email address is private. Other members cannot see it.</li>
          <li>Messages are visible only to the people in the conversation.</li>
        </ul>
      </Section>
      <Section title="5. Service providers and cross-border transfers">
        <p>
          Coursify is hosted on Google Firebase (Google LLC / Google Ireland). Your information may be stored on
          servers outside South Africa. Google is bound by data-processing terms that provide protection comparable to
          POPIA, as section 72 requires. Video links you add may load embedded players from YouTube or Vimeo, and map
          links open Google Maps; those services have their own privacy policies.
        </p>
      </Section>
      <Section title="6. How long we keep it">
        <p>
          We keep your information while your account is active. When you delete your account from your profile, we
          delete your profile, resources, posts, saves, follows and meetups straight away. Messages you sent are
          removed from your side; a copy may remain with the person you wrote to. Backups are overwritten within 30
          days.
        </p>
      </Section>
      <Section title="7. Security">
        <p>
          Data is encrypted in transit (HTTPS) and at rest. Access is restricted by server-side security rules, and
          passwords are never stored in readable form. No system is perfectly secure: if a breach affects your
          information, we will notify you and the Information Regulator as POPIA requires.
        </p>
      </Section>
      <Section title="8. Your rights">
        <p>You may at any time:</p>
        <ul>
          <li>ask what personal information we hold about you and receive a copy;</li>
          <li>correct or update it (most of it directly in your profile);</li>
          <li>delete your account and its data;</li>
          <li>object to processing or withdraw consent;</li>
          <li>
            complain to the Information Regulator (South Africa) at{" "}
            <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="font-semibold text-navy underline">
              inforegulator.org.za
            </a>
            .
          </li>
        </ul>
        <p>
          Email <Mail /> to exercise these rights. We answer within 30 days.
        </p>
      </Section>
      <Section title="9. Children">
        <p>Coursify is for educators aged 18 and over. We do not knowingly collect information from learners or children.</p>
      </Section>
      <Section title="10. Changes">
        <p>If we change this policy in a meaningful way, we will tell you in the app before the change takes effect.</p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <p>
        These terms are an agreement between you and {OPERATOR}. By creating an account or using Coursify you accept
        them. If you do not agree, please do not use the service.
      </p>
      <Section title="1. Who can use Coursify">
        <p>
          Coursify is a professional network for educators. You must be at least 18, give accurate information, and keep
          your password to yourself. You are responsible for activity on your account.
        </p>
      </Section>
      <Section title="2. Your content">
        <p>
          You keep ownership of the resources, posts and messages you share. By sharing a resource to the library, you
          give other Coursify members a free, non-exclusive licence to view, download, adapt and use it for teaching,
          with attribution where practical. You can delete your content at any time.
        </p>
        <p>
          Only share material you have the right to share. Do not upload textbooks, past papers or other works that are
          protected by copyright unless the owner allows it.
        </p>
      </Section>
      <Section title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>harass, threaten or discriminate against anyone;</li>
          <li>share learners' personal information, or any unlawful, explicit or misleading content;</li>
          <li>send spam, malware or links designed to deceive;</li>
          <li>try to access other accounts, scrape the service, or bypass its security;</li>
          <li>impersonate another person or institution.</li>
        </ul>
      </Section>
      <Section title="4. Moderation and termination">
        <p>
          We may remove content or suspend accounts that break these terms or the law. You can close your account at any
          time from your profile.
        </p>
      </Section>
      <Section title="5. Verified badge">
        <p>
          Sharing resources and hosting meetups is reserved for verified teachers. A member is verified once the
          Coursify team has matched their SACE registration number and name on the public SACE register. The badge
          confirms registration with SACE only; it is not a check of qualifications, employment or the quality of a
          resource. We may remove a badge if the registration cannot be confirmed or these terms are broken.
        </p>
      </Section>
      <Section title="6. The service">
        <p>
          Coursify is provided free of charge and "as is". We work to keep it available and secure but cannot promise it
          will be uninterrupted or error-free. Resources are shared by members; check them before using them in class.
        </p>
      </Section>
      <Section title="7. Liability">
        <p>
          To the extent the law allows, Coursify is not liable for indirect or consequential loss, or for content posted
          by members. Nothing in these terms limits rights you have under the Consumer Protection Act, 2008, where it
          applies.
        </p>
      </Section>
      <Section title="8. Law and changes">
        <p>
          These terms are governed by the laws of the Republic of South Africa. We may update them and will tell you in
          the app before material changes take effect. Questions: <Mail />.
        </p>
      </Section>
    </>
  )
}

function Cookies() {
  return (
    <>
      <p>
        Coursify does not use advertising or tracking cookies. We only store what the site needs to work, in your
        browser's storage.
      </p>
      <Section title="Strictly necessary (always on)">
        <ul>
          <li>Firebase Authentication session: keeps you signed in (IndexedDB / local storage).</li>
          <li>Offline cache: a copy of your profile and files you uploaded, so the app works on a weak connection.</li>
          <li>Your cookie choice itself.</li>
        </ul>
        <p>These cannot be switched off without breaking sign-in, so they do not need consent.</p>
      </Section>
      <Section title="Analytics (off unless you accept)">
        <p>
          We do not run analytics today. If we add privacy-friendly usage statistics in future, they will only load after
          you choose "Accept all", and this page will list them.
        </p>
      </Section>
      <Section title="Third-party embeds">
        <p>
          A video resource from YouTube or Vimeo loads that provider's player when you open it. We use YouTube's
          privacy-enhanced mode (youtube-nocookie.com).
        </p>
      </Section>
      <Section title="Change your choice">
        <p>
          <button type="button" onClick={openCookieSettings} className="font-semibold text-navy underline">
            Open cookie settings
          </button>{" "}
          or clear this site's data in your browser at any time.
        </p>
      </Section>
    </>
  )
}

const docs: Record<LegalDoc, { title: string; body: () => ReactNode }> = {
  privacy: { title: "Privacy Policy", body: Privacy },
  terms: { title: "Terms of Use", body: Terms },
  cookies: { title: "Cookie Policy", body: Cookies },
}

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const { title, body: Body } = docs[doc]
  useEffect(() => {
    document.title = `${title} · Coursify`
    window.scrollTo(0, 0)
  }, [title])
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <a href="/" aria-label="Coursify home">
            <Logo />
          </a>
          <a href="/" className="text-sm font-semibold text-navy hover:text-navy-hover">
            Back to Coursify
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Last updated {UPDATED}</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">{title}</h1>
        <nav className="mt-6 flex flex-wrap gap-2 text-[13px]" aria-label="Legal documents">
          {(Object.keys(docs) as LegalDoc[]).map((key) => (
            <a
              key={key}
              href={`/${key}`}
              aria-current={key === doc ? "page" : undefined}
              className={`rounded-full border px-3 py-1.5 font-semibold ${
                key === doc ? "border-navy bg-navy text-white" : "border-line text-muted hover:text-ink"
              }`}
            >
              {docs[key].title}
            </a>
          ))}
        </nav>
        <div className="mt-8 text-[15px] leading-relaxed text-ink/80">
          <Body />
        </div>
      </main>
    </div>
  )
}
