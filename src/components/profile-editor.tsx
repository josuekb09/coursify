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
  const { updateProfile } = useApp()
  const [cropping, setCropping] = useState(false)
  const [form, setForm] = useState({
    name: educator.name,
    school: educator.school,
    subject: educator.subject,
    bio: educator.bio,
    photoData: educator.photoData as string | null | undefined,
    institutionLevel: educator.institutionLevel,
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    updateProfile({
      name: form.name,
      school: form.school,
      subject: form.subject,
      bio: form.bio,
      photoData: form.photoData === undefined ? educator.photoData : form.photoData,
      institutionLevel: form.institutionLevel,
    })
    onClose()
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
            className="grid h-9 w-9 place-items-center rounded-lg text-ink"
            aria-label="Close"
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
                className="rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink hover:border-line-strong"
              >
                Upload photo
              </button>
              {form.photoData ? (
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, photoData: null })
                    setCropping(false)
                  }}
                  className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted hover:text-ink"
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
                  onClick={() => setForm({ ...form, institutionLevel: id })}
                  className={`rounded-lg border px-3 py-2 text-[13px] font-semibold ${
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
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-navy"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}
