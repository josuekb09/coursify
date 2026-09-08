import Logo, { CoursifyMark } from "@/components/logo"
import { isNoAccountMessage } from "@/firebase"
import { useApp } from "@/store"
import type { AuthMode, InstitutionLevel, SignupInput } from "@/types"
import { useState, type FormEvent } from "react"

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_4px_rgba(26,43,74,0.12)]"

export default function AuthScreen({
  mode,
  onMode,
  onBack,
}: {
  mode: AuthMode
  onMode: (next: AuthMode) => void
  onBack: () => void
}) {
  const { login, signup, hasAccounts } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [signupForm, setSignupForm] = useState<SignupInput>({
    name: "",
    email: "",
    password: "",
    institutionLevel: "high-school",
  })

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await login(loginForm.email, loginForm.password)
      if (result) setError(result)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleSignup(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await signup(signupForm)
      if (result) setError(result)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  function goToSignup(email?: string) {
    setError(null)
    if (email) setSignupForm((current) => ({ ...current, email }))
    onMode("signup")
  }

  return (
    <div className="grid min-h-full bg-[#f5f5f5] lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute -right-16 -bottom-10 h-[420px] w-[420px] opacity-[0.1]"
          aria-hidden="true"
        >
          <CoursifyMark className="h-full w-full [&_path]:!fill-white" />
        </div>
        <Logo light />
        <div className="relative max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
            Educator workspace
          </p>
          <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-[-0.04em]">
            No teacher should ever have to start from a blank page.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            Coursify is a professional home for curriculum. High school and university educators
            can join with any valid email address.
          </p>
        </div>
        <p className="relative font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
          Verified educators only
        </p>
      </aside>

      <main className="flex min-h-full flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Logo />
        </div>
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-medium text-muted hover:text-ink"
        >
          Back to Coursify
        </button>

        <div className="mx-auto mt-10 w-full max-w-[440px] flex-1">
          {mode === "login" ? (
            <>
              <h2 className="font-display text-[28px] font-bold tracking-[-0.03em] text-ink">
                Sign In
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Use your email to open your library and profile.
              </p>
              <form className="mt-8 space-y-4" onSubmit={handleLogin}>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    Email
                  </span>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                    className={field}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    Password
                  </span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm({ ...loginForm, password: event.target.value })
                    }
                    className={field}
                    autoComplete="current-password"
                  />
                </label>
                {error ? (
                  <div className="rounded-lg border border-[#ead7d4] bg-[#fbf6f5] px-3.5 py-3">
                    <p className="text-sm text-[#8a3b32]">{error}</p>
                    {isNoAccountMessage(error) ? (
                      <button
                        type="button"
                        onClick={() => goToSignup(loginForm.email)}
                        className="mt-2 text-sm font-semibold text-navy hover:text-navy-hover"
                      >
                        Create Educator Account
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-lg bg-navy text-sm font-semibold text-white shadow-[0_8px_20px_rgba(26,43,74,0.2)] hover:bg-navy-hover disabled:opacity-60"
                >
                  {busy ? "Signing in..." : "Sign In"}
                </button>
              </form>
              <p className="mt-6 text-sm text-muted">
                New to Coursify?{" "}
                <button
                  type="button"
                  onClick={() => goToSignup(loginForm.email)}
                  className="font-semibold text-navy hover:text-navy-hover"
                >
                  Create Educator Account
                </button>
              </p>
              {!hasAccounts ? (
                <p className="mt-3 text-xs text-muted">
                  No educators have registered yet. Create an account with your email.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="font-display text-[28px] font-bold tracking-[-0.03em] text-ink">
                Create Educator Account
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Register with any valid email address. You will complete your profile after signing up.
              </p>
              <form className="mt-8 space-y-4" onSubmit={handleSignup}>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    Full name
                  </span>
                  <input
                    value={signupForm.name}
                    onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })}
                    className={field}
                    autoComplete="name"
                    placeholder="Full name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    Email
                  </span>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })}
                    className={field}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </label>
                <div>
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    Institution type
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ["high-school", "High school"],
                        ["university", "University"],
                      ] as [InstitutionLevel, string][]
                    ).map(([id, label]) => (
                      <button
                        type="button"
                        key={id}
                        onClick={() => setSignupForm({ ...signupForm, institutionLevel: id })}
                        className={`rounded-lg border px-3 py-2.5 text-[13px] font-semibold ${
                          signupForm.institutionLevel === id
                            ? "border-navy bg-navy-soft text-navy"
                            : "border-line bg-canvas text-muted hover:text-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    Password
                  </span>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) =>
                      setSignupForm({ ...signupForm, password: event.target.value })
                    }
                    className={field}
                    autoComplete="new-password"
                  />
                  <span className="mt-1.5 block text-[12px] text-muted">
                    At least 8 characters. Your password is stored in Firebase Authentication.
                  </span>
                </label>
                {error ? <p className="text-sm text-[#8a3b32]">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-lg bg-navy text-sm font-semibold text-white shadow-[0_8px_20px_rgba(26,43,74,0.2)] hover:bg-navy-hover disabled:opacity-60"
                >
                  {busy ? "Creating account..." : "Create Educator Account"}
                </button>
              </form>
              <p className="mt-6 text-sm text-muted">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    onMode("login")
                  }}
                  className="font-semibold text-navy hover:text-navy-hover"
                >
                  Sign In
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
