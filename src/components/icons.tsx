type IconProps = { className?: string; filled?: boolean; title?: string }

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

function Calendar(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3" y="4.5" width="14" height="12.5" rx="1.5" />
      <path d="M3 8.5h14M7 3v3M13 3v3" />
    </svg>
  )
}

function Grid(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  )
}

function Upload(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5" />
      <path d="M4 13v2.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V13" />
    </svg>
  )
}

function Bookmark(p: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={p.className}
      fill={p.filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3.5h8a.5.5 0 0 1 .5.5v12l-4.5-3-4.5 3V4a.5.5 0 0 1 .5-.5Z" />
    </svg>
  )
}

function Layers(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M10 3 3 6.5 10 10l7-3.5L10 3Z" />
      <path d="M3 10.5 10 14l7-3.5M3 13.5 10 17l7-3.5" />
    </svg>
  )
}

function Search(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m17 17-3.5-3.5" />
    </svg>
  )
}

function Download(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M10 3v8m0 0 3.5-3.5M10 11 6.5 7.5" />
      <path d="M4 14.5V16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5" />
    </svg>
  )
}

function Trend(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M3 13.5 7.5 9l3 3L17 5.5" />
      <path d="M13 5.5h4v4" />
    </svg>
  )
}

function Pin(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M10 17s5-4.2 5-8.5A5 5 0 0 0 5 8.5C5 12.8 10 17 10 17Z" />
      <circle cx="10" cy="8.5" r="1.8" />
    </svg>
  )
}

function Briefcase(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3" y="6.5" width="14" height="9.5" rx="1.5" />
      <path d="M7 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 13 5v1.5M3 10.5h14" />
    </svg>
  )
}

function File(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M6 2.5h5L15 6.5V16a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 5 16V4a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M11 2.5v4h4" />
    </svg>
  )
}

function Eye(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M2.5 10S5.5 4.5 10 4.5 17.5 10 17.5 10 14.5 15.5 10 15.5 2.5 10 2.5 10Z" />
      <circle cx="10" cy="10" r="2.2" />
    </svg>
  )
}

function Plus(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  )
}

function Award(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <circle cx="10" cy="8" r="4.5" />
      <path d="M7.3 11.7 6 17l4-2 4 2-1.3-5.3" />
    </svg>
  )
}

function Menu(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
    </svg>
  )
}

function Close(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  )
}

function VerifiedSeal(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} aria-hidden="true">
      <path
        d="M10 1.5 12.1 3l2.5-.4 1 2.4 2.3 1.1-.5 2.5L18.5 10l-1.6 2 .5 2.5-2.3 1.1-1 2.4-2.5-.4L10 18.5 7.9 17l-2.5.4-1-2.4L2.1 14l.5-2.5L1 10l1.6-2-.5-2.5 2.3-1.1 1-2.4L7.9 3 10 1.5Z"
        fill="var(--color-navy)"
      />
      <path
        d="m6.8 10.2 2 2 4.4-4.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Pencil(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M12.5 3.5 16.5 7.5 8 16H4v-4L12.5 3.5Z" />
      <path d="m11 5 4 4" />
    </svg>
  )
}

function Logout(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      <path d="M11 10h6m0 0-2.5-2.5M17 10l-2.5 2.5" />
    </svg>
  )
}

function Trash(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M4.5 6h11M8 6V4.5h4V6M6.5 6l.5 10h6l.5-10" />
    </svg>
  )
}

function LinkIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M8.5 11.5 7 13a3 3 0 0 0 4.2 4.2l2.3-2.3a3 3 0 0 0 0-4.2" />
      <path d="M11.5 8.5 13 7a3 3 0 0 0-4.2-4.2L6.5 5.1a3 3 0 0 0 0 4.2" />
    </svg>
  )
}

function Chevron(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="m5.5 7.5 4.5 5 4.5-5" />
    </svg>
  )
}

function Check(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="m4.5 10.5 4 4 7-8" />
    </svg>
  )
}

function Users(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <circle cx="7.5" cy="7" r="2.4" />
      <path d="M3.5 15.5c.4-2.4 2-3.7 4-3.7s3.6 1.3 4 3.7" />
      <circle cx="13.5" cy="7.2" r="2.1" />
      <path d="M12.2 11.9c1.7-.2 3.3.8 3.8 3.1" />
    </svg>
  )
}

function Mail(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3" y="4.5" width="14" height="11" rx="1.5" />
      <path d="m4 6.5 6 4.5 6-4.5" />
    </svg>
  )
}

function Gmail(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" aria-hidden="true">
      <path
        d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6Z"
        fill="#F8F9FA"
      />
      <path d="M22 6 12 13 2 6v1.5l10 7 10-7V6Z" fill="#EA4335" />
      <path d="M22 6v12c0 1.1-.9 2-2 2h-3V11l5-5Z" fill="#FBBC04" />
      <path d="M2 6v12c0 1.1.9 2 2 2h3V11L2 6Z" fill="#4285F4" />
      <path d="M17 20h3c1.1 0 2-.9 2-2V8.5L17 12v8Z" fill="#34A853" />
      <path d="M7 20H4c-1.1 0-2-.9-2-2V8.5L7 12v8Z" fill="#4285F4" />
    </svg>
  )
}

function Instagram(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={p.className} fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="coursify-ig-grad" cx="20%" cy="105%" r="120%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="15%" stopColor="#fdf497" />
          <stop offset="50%" stopColor="#fd5949" />
          <stop offset="70%" stopColor="#d6249f" />
          <stop offset="95%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#coursify-ig-grad)" />
      <circle cx="12" cy="12" r="4.2" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="#fff" />
      <rect x="5.2" y="5.2" width="13.6" height="13.6" rx="3.8" stroke="#fff" strokeWidth="1.8" />
    </svg>
  )
}

function Copy(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M4 13H3.5A1.5 1.5 0 0 1 2 11.5v-8A1.5 1.5 0 0 1 3.5 2h8A1.5 1.5 0 0 1 13 3.5V4" />
    </svg>
  )
}

function Film(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3" y="4" width="14" height="12" rx="1.5" />
      <path d="M8 8.2 13 10 8 11.8V8.2Z" />
    </svg>
  )
}

function Slides(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3.5" y="4.5" width="13" height="9" rx="1.5" />
      <path d="M7 16h6M10 13.5V16" />
    </svg>
  )
}

function Table(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3.5" y="4" width="13" height="12" rx="1.5" />
      <path d="M3.5 8h13M3.5 12h13M8 4v12M12 4v12" />
    </svg>
  )
}

function Code(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="m7 6.5-3.5 3.5L7 13.5M13 6.5l3.5 3.5L13 13.5" />
    </svg>
  )
}

function Archive(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3.5" y="3.5" width="13" height="4" rx="1" />
      <path d="M4.5 7.5h11V16a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V7.5Z" />
      <path d="M8.5 10.5h3" />
    </svg>
  )
}

function Message(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M4 5.5h12A1.5 1.5 0 0 1 17.5 7v6A1.5 1.5 0 0 1 16 14.5H9l-4 3v-3H4A1.5 1.5 0 0 1 2.5 13V7A1.5 1.5 0 0 1 4 5.5Z" />
    </svg>
  )
}

function Send(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="m4 10 12-6-4 12-2.5-4.5L4 10Z" />
    </svg>
  )
}

function ChevronLeft(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="m12.5 5.5-5 4.5 5 4.5" />
    </svg>
  )
}

function ChevronRight(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="m7.5 5.5 5 4.5-5 4.5" />
    </svg>
  )
}

function Shield(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M10 2.5 4 5v5.5c0 4.2 2.7 6.8 6 7.5 3.3-.7 6-3.3 6-7.5V5l-6-2.5Z" />
    </svg>
  )
}

function Smile(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M7 8.5h.01M13 8.5h.01" />
      <path d="M7 12.5a4 4 0 0 0 6 0" />
    </svg>
  )
}

function Paperclip(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="M14.5 9.5 8.7 15.3a3.25 3.25 0 0 1-4.6-4.6l6.4-6.4a2.2 2.2 0 0 1 3.1 3.1L7.2 13.8a1.1 1.1 0 0 1-1.6-1.6l5.7-5.7" />
    </svg>
  )
}

function DoubleCheck(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <path d="m2.5 10.5 4 4 9-9" />
      <path d="m8.5 10.5 3 3 6-6" />
    </svg>
  )
}

function Photo(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke}>
      <rect x="3" y="3.5" width="14" height="13" rx="2" />
      <circle cx="7.5" cy="7.5" r="1.25" />
      <path d="m3 14 4.5-4.5 4 4" />
      <path d="m10 12 2.5-2.5 4.5 4.5" />
    </svg>
  )
}

const Icons = {
  Calendar,
  Grid,
  Upload,
  Bookmark,
  Layers,
  Search,
  Download,
  Trend,
  Pin,
  Briefcase,
  File,
  Eye,
  Plus,
  Award,
  Menu,
  Close,
  VerifiedSeal,
  Pencil,
  Logout,
  Trash,
  Link: LinkIcon,
  Chevron,
  Check,
  Users,
  Mail,
  Gmail,
  Instagram,
  Copy,
  Film,
  Slides,
  Table,
  Code,
  Archive,
  Message,
  Send,
  ChevronLeft,
  ChevronRight,
  Shield,
  Smile,
  Paperclip,
  DoubleCheck,
  Photo,
}

export default Icons
