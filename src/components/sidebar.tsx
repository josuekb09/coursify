import Icons from "@/components/icons"
import Logo from "@/components/logo"
import { nav, STORAGE_CAP_BYTES } from "@/data"
import { useApp } from "@/store"
import type { View } from "@/types"
import { formatBytes } from "@/utils"

const iconMap = {
  Grid: Icons.Grid,
  Upload: Icons.Upload,
  Bookmark: Icons.Bookmark,
  Layers: Icons.Layers,
  Users: Icons.Users,
  Message: Icons.Message,
}

export default function Sidebar({
  view,
  mobile = false,
  onNavigate,
  onClose,
}: {
  view: View
  mobile?: boolean
  onNavigate: (next: View) => void
  onClose?: () => void
}) {
  const { currentUser, logout, unreadCount, followBackSuggestions } = useApp()
  const used = currentUser?.storageBytes ?? 0
  const percent = Math.min(100, Math.round((used / STORAGE_CAP_BYTES) * 100))
  const unread = unreadCount
  const discoverAlerts = followBackSuggestions.length

  return (
    <div className="flex h-full flex-col">
      {mobile ? (
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <Icons.Close className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        Menu
      </p>
      <nav className="flex flex-col gap-0.5">
        {nav.map((item) => {
          const Icon = iconMap[item.icon]
          const on = view === item.view
          return (
            <button
              type="button"
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                on
                  ? "bg-navy-soft font-semibold text-navy"
                  : "font-medium text-muted hover:bg-black/[0.03] hover:text-ink"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
              {item.view === "messages" && unread > 0 ? (
                <span className="ml-auto rounded-full bg-navy px-1.5 font-mono text-[10px] text-white">
                  {unread}
                </span>
              ) : null}
              {item.view === "discover" && discoverAlerts > 0 ? (
                <span className="ml-auto rounded-full bg-navy px-1.5 font-mono text-[10px] text-white">
                  {discoverAlerts}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="mt-8 rounded-xl border border-line bg-surface p-4">
        <p className="font-display text-[13px] font-semibold text-ink">Storage</p>
        <p className="mt-1 font-mono text-[11px] text-muted">
          {formatBytes(used)} of {formatBytes(STORAGE_CAP_BYTES)}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-navy" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-auto flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-navy hover:border-line-strong hover:bg-navy-soft"
      >
        <Icons.Logout className="h-[18px] w-[18px]" />
        Sign out
      </button>
    </div>
  )
}
