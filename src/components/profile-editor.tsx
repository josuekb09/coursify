import Avatar from "@/components/avatar"
import Icons from "@/components/icons"
import PhotoCropper from "@/components/photo-cropper"
import SubjectPicker from "@/components/subject-picker"
import { useApp } from "@/store"
import type { Educator, InstitutionLevel } from "@/types"
import { useState, type FormEvent } from "react"

const field =
  "h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-navy"

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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Close editor"
        disabled={locked}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.18)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-sm font-semibold text-ink">Edit profile</p>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink disabled:opacity-50"
            aria-label="Close"
            disabled={locked}
            onClick={onClose}
          >
            <Icons.Close className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-4">
            <Avatar educator={preview} size={72} rounded="rounded-2xl" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCropping(true)}
                disabled={locked}
                className="rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-strong disabled:opacity-50"
              >
                Upload photo
              </button>
              {form.photoData ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setForm({ ...form, photoData: null })
                    setCropping(false)
                  }}
                  className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
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
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
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
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              School / institution
            </span>
            <input
              value={form.school}
              onChange={(event) => setForm({ ...form, school: event.target.value })}
              className={field}
              disabled={locked}
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
                  disabled={locked}
                  onClick={() => setForm({ ...form, institutionLevel: id })}
                  className={`rounded-lg border px-3 py-2 text-[13px] font-semibold disabled:opacity-50 ${
                    form.institutionLevel === id
                      ? "border-navy bg-navy-soft text-navy"
                      : "border-line bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Primary subject taught
            </span>
            <SubjectPicker
              value={form.subject}
              onChange={(subject) => setForm({ ...form, subject })}
            />
          </div>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              Bio / credentials
            </span>
            <textarea
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              rows={5}
              disabled={locked}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-navy disabled:opacity-50"
            />
          </label>

          {error ? <p className="text-sm text-[#8a3b32]">{error}</p> : null}
        </div>

        {isOwner && confirmDelete ? (
          <div className="border-t border-[#ead7d4] bg-[#fbf6f5] px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a3b32]">
              Delete account
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/80">
              This permanently removes your profile, uploads, messages, meetups, and login.
              Enter your password to confirm.
            </p>
            <label className="mt-3 block">
              <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-[#8a3b32]">
                Password
              </span>
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
                className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink disabled:opacity-50"
              >
                Keep account
              </button>
              <button
                type="button"
                disabled={deleting || !deletePassword.trim()}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-[#8a3b32] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#733129] disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Permanently delete account"}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-[#8a3b32]">{error}</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          {isOwner ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setConfirmDelete(true)
                setError(null)
              }}
              className="text-[13px] font-semibold text-[#8a3b32] hover:underline disabled:opacity-50"
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
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={locked}
              className="rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
