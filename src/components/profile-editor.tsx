import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import PhotoCropper from "@/components/photo-cropper"
import SubjectPicker from "@/components/subject-picker"
import { useApp } from "@/store"
import type { Educator, InstitutionLevel } from "@/types"
import { useState, type FormEvent } from "react"

const field =
  "h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none transition-shadow focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.10)] disabled:opacity-50"
const label = "mb-1.5 block text-[12px] font-semibold text-ink"

export default function ProfileEditor({
  educator,
  onClose,
}: {
  educator: Educator
  onClose: () => void
}) {
  const { currentUser, updateProfile, deleteAccount, notify } = useApp()
  const [cropping, setCropping] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: educator.name,
    school: educator.school,
    subject: educator.subject,
    bio: educator.bio,
    photoData: educator.photoData as string | null | undefined,
    institutionLevel: educator.institutionLevel,
  })
  const isOwner = currentUser?.id === educator.id
  const locked = deleting || saving

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (locked) return
    setSaving(true)
    setError(null)
    try {
      const result = await updateProfile({
        name: form.name,
        school: form.school,
        subject: form.subject,
        bio: form.bio,
        photoData: form.photoData === undefined ? educator.photoData : form.photoData,
        institutionLevel: form.institutionLevel,
      })
      if (result) {
        setError(result)
        return
      }
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save your profile. Please try again."
      setError(message)
      notify(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteAccount(deletePassword)
      if (result) {
        setError(result)
        notify(result)
      }
    } catch {
      const message = "Could not delete your account. Please try again."
      setError(message)
      notify(message)
    } finally {
      setDeleting(false)
    }
  }

  const preview = {
    ...educator,
    name: form.name,
    initials: educator.initials,
    photoData: form.photoData ?? undefined,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="animate-fade-in absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
        aria-label="Close editor"
        disabled={locked}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        className="animate-sheet-up relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.18)] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">Edit profile</h2>
            <p className="mt-0.5 text-[13px] text-muted">This is what colleagues see when they find you.</p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
            aria-label="Close"
            disabled={locked}
            onClick={onClose}
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex items-center gap-4 rounded-2xl bg-canvas p-3">
            <button
              type="button"
              onClick={() => setCropping(true)}
              disabled={locked}
              className="group relative shrink-0 rounded-full"
              aria-label="Change photo"
            >
              <Avatar educator={preview} size={72} rounded="rounded-full" />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-navy/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Icons.Camera className="h-5 w-5" />
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink">Profile photo</p>
              <p className="text-[12px] text-muted">A clear, friendly headshot works best.</p>
              <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCropping(true)}
                disabled={locked}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-50"
              >
                <Icons.Camera className="h-3.5 w-3.5" />
                {form.photoData ? "Change" : "Upload photo"}
              </button>
              {form.photoData ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setForm({ ...form, photoData: null })
                    setCropping(false)
                  }}
                  className="h-8 rounded-lg px-3 text-[12.5px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
              </div>
            </div>
          </div>
          {cropping ? (
            <PhotoCropper
              onApply={(dataUrl) => {
                setForm({ ...form, photoData: dataUrl })
                setCropping(false)
              }}
              onCancel={() => setCropping(false)}
            />
          ) : null}

          <label className="block">
            <span className={label}>
              Full name
            </span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={field}
              disabled={locked}
            />
          </label>
          <label className="block">
            <span className={label}>
              School
            </span>
            <input
              value={form.school}
              onChange={(event) => setForm({ ...form, school: event.target.value })}
              className={field}
              disabled={locked}
            />
          </label>
          <div>
            <span className={label}>
              Where you teach
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
                  disabled={locked}
                  onClick={() => setForm({ ...form, institutionLevel: id })}
                  className={`h-11 rounded-xl border px-3 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                    form.institutionLevel === id
                      ? "border-navy bg-navy-soft text-navy"
                      : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className={label}>
              Main subject
            </span>
            <SubjectPicker
              value={form.subject}
              onChange={(subject) => setForm({ ...form, subject })}
              disabled={locked}
            />
          </div>
          <label className="block">
            <span className={label}>
              Bio
            </span>
            <textarea
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              rows={5}
              maxLength={800}
              disabled={locked}
              placeholder="e.g. Grade 10–12 Mathematics teacher in Soweto. I build CAPS-aligned revision packs and love a good geometry proof."
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition-shadow focus:border-navy focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,43,74,0.10)] disabled:opacity-50"
            />
            <span className="mt-1 block text-right text-[11px] tabular-nums text-muted">{form.bio.length}/800</span>
          </label>

          {error && !confirmDelete ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#fbeeec] px-3 py-2.5 text-[13px] text-[#8a3b32]">
              <Icons.Alert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        {isOwner && confirmDelete ? (
          <div className="animate-fade-in border-t border-[#ead7d4] bg-[#fbf6f5] px-5 py-4 sm:px-6">
            <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#8a3b32]">
              <Icons.Alert className="h-4 w-4" />
              Delete your account
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">
              This permanently removes your profile, uploads, messages, meetups, and login.
              Enter your password to confirm.
            </p>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[12px] font-semibold text-[#8a3b32]">Password</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                disabled={deleting}
                autoComplete="current-password"
                className={field}
                placeholder="Your Coursify password"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setConfirmDelete(false)
                  setDeletePassword("")
                  setError(null)
                }}
                className="h-10 rounded-xl border border-line bg-surface px-3.5 text-[13px] font-medium text-ink disabled:opacity-50"
              >
                Keep account
              </button>
              <button
                type="button"
                disabled={deleting || !deletePassword.trim()}
                onClick={() => void handleDelete()}
                className="h-10 rounded-xl bg-[#8a3b32] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#733129] disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Permanently delete account"}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-[#8a3b32]">{error}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          {isOwner ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setConfirmDelete(true)
                setError(null)
              }}
              className="text-[13px] font-medium text-muted transition-colors hover:text-[#8a3b32] disabled:opacity-50"
            >
              Delete account
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              className="h-10 rounded-xl px-4 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={locked}
              className="h-10 rounded-xl bg-navy px-4 text-sm font-semibold text-white transition-colors hover:bg-navy-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
