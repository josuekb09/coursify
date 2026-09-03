import { useEffect, useRef, useState } from "react"
import AuthScreen from "@/components/auth-screen"
import Dashboard from "@/components/dashboard"
import DirectoryView from "@/components/directory-view"
import Landing from "@/components/landing"
import Header from "@/components/header"
import MessagesView from "@/components/messages-view"
import Profile from "@/components/profile"
import SavedView from "@/components/saved-view"
import Sidebar from "@/components/sidebar"
import SubjectsView from "@/components/subjects-view"
import ToastViewport from "@/components/toast-viewport"
import UploadModal from "@/components/upload-modal"
import UploadsView from "@/components/uploads-view"
import { useApp } from "@/store"
import type { AuthMode, View } from "@/types"

export default function App() {
  const { currentUser, educatorById, live } = useApp()
  const [view, setView] = useState<View>("dashboard")
  const [profileId, setProfileId] = useState<string | null>(null)
  const [messagePeer, setMessagePeer] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [gate, setGate] = useState<"landing" | AuthMode>("landing")
  const [phase, setPhase] = useState<"landing" | "auth" | "app">("landing")
  const [profileEditing, setProfileEditing] = useState(false)
  const booted = useRef(false)

  useEffect(() => {
    if (booted.current) return
    if (currentUser) {
      setPhase("app")
      booted.current = true
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser && phase === "auth") {
      setPhase("app")
      const incomplete = !currentUser.bio.trim() || !currentUser.school.trim()
      if (incomplete) {
        setProfileId(currentUser.id)
        setView("profile")
        setProfileEditing(true)
      }
    }
  }, [currentUser, phase])

  useEffect(() => {
    if (!currentUser && phase === "app") {
      setPhase("landing")
      setGate("landing")
      setView("dashboard")
      setProfileId(null)
      setMessagePeer(null)
      setQuery("")
      setMenuOpen(false)
      setUploadOpen(false)
    }
  }, [currentUser, phase])

  if (phase === "landing") {
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
      </>
    )
  }

  if (phase === "auth" || !currentUser) {
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
      </>
    )
  }

  const user = currentUser
  const profile = educatorById(profileId ?? user.id) ?? user

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
    <div className="min-h-full overflow-x-hidden bg-canvas text-ink">
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
        onUpload={() => setUploadOpen(true)}
        onMessages={() => goMessages()}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[212px] shrink-0 overflow-y-auto border-r border-line px-4 py-6 lg:block">
          <Sidebar view={view} onNavigate={goNav} />
        </aside>

        {view === "dashboard" ? (
          <Dashboard
            query={query}
            onAuthor={goProfile}
            onUpload={() => setUploadOpen(true)}
            onDiscover={() => goNav("discover")}
            onMessage={goMessages}
          />
        ) : null}
        {view === "discover" ? (
          <DirectoryView query={query} onAuthor={goProfile} onMessage={goMessages} />
        ) : null}
        {view === "messages" ? (
          <MessagesView peerId={messagePeer} query={query} onAuthor={goProfile} />
        ) : null}
        {view === "uploads" ? <UploadsView query={query} onAuthor={goProfile} /> : null}
        {view === "saved" ? <SavedView query={query} onAuthor={goProfile} /> : null}
        {view === "subjects" ? <SubjectsView query={query} onAuthor={goProfile} /> : null}
        {view === "profile" ? (
          <Profile
            educator={profile}
            startEditing={profileEditing}
            onEditingChange={setProfileEditing}
            onUpload={() => setUploadOpen(true)}
            onMessage={goMessages}
          />
        ) : null}
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
    </div>
  )
}
