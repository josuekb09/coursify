import { useEffect, useRef, useState } from "react"
import AdminAnalyticsView from "@/components/admin-analytics-view"
import AuthScreen from "@/components/auth-screen"
import CookieConsent from "@/components/cookie-consent"
import LegalPage, { legalDocFromPath } from "@/components/legal-page"
import Dashboard from "@/components/dashboard"
import ErrorBoundary from "@/components/error-boundary"
import DirectoryView from "@/components/directory-view"
import Landing from "@/components/landing"
import Header from "@/components/header"
import MeetupsView from "@/components/meetups-view"
import MessagesView from "@/components/messages-view"
import Profile from "@/components/profile"
import SavedView from "@/components/saved-view"
import Sidebar from "@/components/sidebar"
import SubjectsView from "@/components/subjects-view"
import ToastViewport from "@/components/toast-viewport"
import UploadModal from "@/components/upload-modal"
import UploadsView from "@/components/uploads-view"
import VerifiedBadgeBanner from "@/components/verified-badge-banner"
import { VERIFIED_ONLY, useApp } from "@/store"
import type { AuthMode, View } from "@/types"

function EmailVerificationBanner() {
  const { emailVerified, resendVerification, notify } = useApp()
  const [sent, setSent] = useState(false)
  if (emailVerified) return null
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-warn-soft px-4 py-2 text-center text-[13px] text-warn">
      <span>
        Please confirm your email address.
        <span className="hidden sm:inline"> We sent you a link when you signed up.</span>
      </span>
      <button
        type="button"
        disabled={sent}
        onClick={async () => {
          const error = await resendVerification()
          if (error) notify(error)
          else {
            setSent(true)
            notify("Verification email sent.")
          }
        }}
        className="font-semibold underline disabled:no-underline disabled:opacity-70"
      >
        {sent ? "Email sent" : "Resend link"}
      </button>
    </p>
  )
}

function WorkspaceSplash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas text-ink">
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted">
        Opening your workspace…
      </p>
    </div>
  )
}

export default function App() {
  const legalDoc = legalDocFromPath(window.location.pathname)
  if (legalDoc) {
    return (
      <>
        <LegalPage doc={legalDoc} />
        <CookieConsent />
      </>
    )
  }
  return <Workspace />
}

function Workspace() {
  const { currentUser, educatorById, isFounder, live, signedIn, ready, notify } = useApp()
  const [view, setView] = useState<View>("dashboard")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [messagePeer, setMessagePeer] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [gate, setGate] = useState<"landing" | AuthMode>("landing")
  const [phase, setPhase] = useState<"landing" | "auth" | "app">("landing")
  const [profileEditing, setProfileEditing] = useState(false)
  const onboarded = useRef(false)

  useEffect(() => {
    if (signedIn) {
      setPhase("app")
      return
    }
    if (phase === "auth") return
    setPhase("landing")
    setGate("landing")
    setView("dashboard")
    setProfileId(null)
    setMessagePeer(null)
    setQuery("")
    setMenuOpen(false)
    setUploadOpen(false)
    setProfileEditing(false)
    onboarded.current = false
  }, [signedIn, phase])

  useEffect(() => {
    if (!currentUser || phase !== "app") return
    if (gate !== "signup" && gate !== "login") return
    if (onboarded.current) return
    onboarded.current = true
    const incomplete = !currentUser.bio.trim() || !currentUser.school.trim()
    if (incomplete) {
      setProfileId(currentUser.id)
      setView("profile")
      setProfileEditing(true)
    }
    setGate("landing")
  }, [currentUser, gate, phase])

  if (!ready) return <WorkspaceSplash />

  if (!signedIn) {
    if (phase === "auth") {
      return (
        <>
          <AuthScreen
            mode={gate === "landing" ? "login" : gate}
            onMode={setGate}
            onBack={() => {
              setGate("landing")
              setPhase("landing")
            }}
          />
          <ToastViewport />
          <CookieConsent />
        </>
      )
    }
    return (
      <>
        <Landing
          onSignIn={() => {
            setGate("login")
            setPhase("auth")
          }}
          onGetStarted={() => {
            setGate("signup")
            setPhase("auth")
          }}
        />
        <ToastViewport />
        <CookieConsent />
      </>
    )
  }

  if (!currentUser) return <WorkspaceSplash />

  const user = currentUser
  const profile = educatorById(profileId ?? user.id) ?? user

  function openUpload() {
    if (!user.verified && !isFounder) {
      notify(VERIFIED_ONLY)
      window.scrollTo({ top: 0 })
      return
    }
    setUploadOpen(true)
  }

  function goDiscover() {
    setView("discover")
    setMenuOpen(false)
  }

  function goProfileFromSearch(id: string) {
    setProfileId(id)
    setView("profile")
    setProfileEditing(false)
    setMenuOpen(false)
  }

  function handleSearchSubmit() {
    if (query.trim().length >= 2) goDiscover()
  }

  function goDashboard() {
    setView("dashboard")
    setMenuOpen(false)
  }

  function goProfile(id?: string) {
    setProfileId(id ?? user.id)
    setView("profile")
    setMenuOpen(false)
  }

  function goMessages(peerId?: string) {
    setMessagePeer(peerId ?? null)
    setView("messages")
    setMenuOpen(false)
  }

  function goNav(next: View) {
    if (next === "admin" && !isFounder) {
      setView("dashboard")
      return
    }
    if (next === "profile") {
      goProfile(user.id)
      return
    }
    if (next === "messages") {
      goMessages()
      return
    }
    setView(next)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      {!live ? (
        <p className="bg-navy px-4 py-2 text-center text-[13px] text-white">
          Reconnecting to Coursify so messages and profiles stay in sync…
        </p>
      ) : null}
      <Header
        view={view}
        query={query}
        onQuery={setQuery}
        onSearchSubmit={handleSearchSubmit}
        onColleague={goProfileFromSearch}
        onDiscover={goDiscover}
        onDashboard={goDashboard}
        onProfile={() => goProfile(user.id)}
        onUpload={openUpload}
        onMessages={() => goMessages()}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <EmailVerificationBanner />
      <VerifiedBadgeBanner onViewProfile={() => goProfile(user.id)} />

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[212px] shrink-0 overflow-y-auto border-r border-line px-4 py-6 lg:block">
          <Sidebar view={view} onNavigate={goNav} />
        </aside>

        <ErrorBoundary resetKey={`${view}:${profileId ?? ""}`}>
        {view === "dashboard" ? (
          <Dashboard
            query={query}
            onAuthor={goProfile}
            onUpload={openUpload}
            onDiscover={() => goNav("discover")}
            onMessage={goMessages}
            onSubjects={() => goNav("subjects")}
          />
        ) : null}
        {view === "discover" ? (
          <DirectoryView query={query} onAuthor={goProfile} onMessage={goMessages} />
        ) : null}
        {view === "meetups" ? <MeetupsView query={query} onAuthor={goProfile} /> : null}
        {view === "messages" ? (
          <MessagesView peerId={messagePeer} query={query} onAuthor={goProfile} />
        ) : null}
        {view === "uploads" ? <UploadsView query={query} onAuthor={goProfile} /> : null}
        {view === "saved" ? <SavedView query={query} onAuthor={goProfile} /> : null}
        {view === "subjects" ? <SubjectsView query={query} onAuthor={goProfile} /> : null}
        {view === "admin" && isFounder ? <AdminAnalyticsView /> : null}
        {view === "profile" ? (
          <Profile
            educator={profile}
            startEditing={profileEditing}
            onEditingChange={setProfileEditing}
            onUpload={openUpload}
            onMessage={goMessages}
          />
        ) : null}
        </ErrorBoundary>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-navy/30"
            aria-label="Close navigation overlay"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative h-full w-[min(18rem,88vw)] bg-canvas p-4 shadow-[0_16px_48px_rgba(18,20,28,0.16)]">
            <Sidebar
              view={view}
              mobile
              onNavigate={goNav}
              onClose={() => setMenuOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {uploadOpen ? <UploadModal onClose={() => setUploadOpen(false)} /> : null}
      <ToastViewport />
      <CookieConsent />
    </div>
  )
}
