import { useApp } from "@/store"

export default function ToastViewport() {
  const { toasts } = useApp()
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-4 z-[70] flex flex-col gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[min(100%-2rem,320px)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[0_8px_30px_rgba(18,20,28,0.12)]"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
