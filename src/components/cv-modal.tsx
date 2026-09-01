import Icons from "@/components/icons"
import type { Educator } from "@/types"

export default function CvModal({
  educator,
  onClose,
  onDownload,
}: {
  educator: Educator
  onClose: () => void
  onDownload: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Close CV preview"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-[0_24px_80px_rgba(18,20,28,0.18)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">Curriculum Vitae</p>
            <p className="font-mono text-[11px] text-muted">
              {educator.name.trim().replace(/\s+/g, "_")}_CV.txt
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover"
            >
              <Icons.Download className="h-4 w-4" />
              Download
            </button>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink"
              aria-label="Close"
              onClick={onClose}
            >
              <Icons.Close className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-6 py-6 sm:px-10">
          <p className="font-display text-xl font-bold tracking-[-0.02em] text-ink">
            {educator.name}
          </p>
          <p className="mt-1 text-sm text-muted">
            {educator.subject} · {educator.school}
          </p>
          <p className="mt-1 font-mono text-[12px] text-muted">{educator.email}</p>
          <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Bio & credentials
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed text-ink/80">{educator.bio}</p>
        </div>
      </div>
    </div>
  )
}
