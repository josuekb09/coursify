import {
  Apple,
  Bell,
  CalendarPlus,
  ChevronUp,
  Flag,
  Heart,
  History,
  Lightbulb,
  ListChecks,
  Lock,
  PawPrint,
  Plane,
  Share2,
  Trophy,
  Hourglass,
  CircleCheck,
  CircleX,
  Timer,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clapperboard,
  Clock3,
  CodeXml,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileText,
  Folder,
  Globe,
  Image,
  Layers,
  LayoutGrid,
  Link2,
  LogOut,
  Mail,
  MapPin,
  Maximize2,
  Menu,
  MessageCircle,
  Mic,
  Paperclip,
  Pause,
  PencilLine,
  Play,
  Plus,
  Presentation,
  Search,
  SendHorizontal,
  Sheet,
  ShieldCheck,
  Smile,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from "lucide-react"

type IconProps = { className?: string; filled?: boolean; title?: string }

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

// Lucide line icons, tuned to one stroke weight across the app. `filled` fills the shape (saved bookmarks).
function lucide(Icon: LucideIcon) {
  function Wrapped({ className, filled, title }: IconProps) {
    return (
      <Icon
        className={className}
        strokeWidth={1.75}
        absoluteStrokeWidth={false}
        fill={filled ? "currentColor" : "none"}
        aria-hidden={title ? undefined : true}
        aria-label={title}
        role={title ? "img" : undefined}
      />
    )
  }
  return Wrapped
}

/* Brand marks and the verified seal stay hand-drawn. */

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

function Gmail(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke} aria-hidden="true">
      <path d="M3 6.5v8A1.5 1.5 0 0 0 4.5 16H6V9l4 3 4-3v7h1.5a1.5 1.5 0 0 0 1.5-1.5v-8a1.8 1.8 0 0 0-2.9-1.4L10 8 5.9 5.1A1.8 1.8 0 0 0 3 6.5Z" />
    </svg>
  )
}

function Instagram(p: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={p.className} {...stroke} aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="4.2" />
      <circle cx="10" cy="10" r="3.2" />
      <path d="M14.1 5.9h.01" strokeWidth="2.2" />
    </svg>
  )
}

const Icons = {
  Alert: lucide(CircleAlert),
  Clock: lucide(Clock3),
  Video: lucide(Video),
  ArrowUpRight: lucide(ArrowUpRight),
  ArrowRight: lucide(ArrowRight),
  Expand: lucide(Maximize2),
  Users3: lucide(UsersRound),
  Book: lucide(BookOpen),
  Sparkle: lucide(Sparkles),
  Camera: lucide(Camera),
  Calendar: lucide(CalendarDays),
  Grid: lucide(LayoutGrid),
  Upload: lucide(Upload),
  Bookmark: lucide(Bookmark),
  Layers: lucide(Layers),
  Search: lucide(Search),
  Download: lucide(Download),
  Trend: lucide(TrendingUp),
  Pin: lucide(MapPin),
  Briefcase: lucide(BriefcaseBusiness),
  File: lucide(FileText),
  Eye: lucide(Eye),
  Plus: lucide(Plus),
  Award: lucide(Award),
  Menu: lucide(Menu),
  Close: lucide(X),
  Pencil: lucide(PencilLine),
  Logout: lucide(LogOut),
  Trash: lucide(Trash2),
  Link: lucide(Link2),
  Chevron: lucide(ChevronDown),
  Check: lucide(Check),
  Users: lucide(Users),
  Mail: lucide(Mail),
  Copy: lucide(Copy),
  Film: lucide(Clapperboard),
  Slides: lucide(Presentation),
  Table: lucide(Sheet),
  Code: lucide(CodeXml),
  Archive: lucide(FileArchive),
  Message: lucide(MessageCircle),
  Send: lucide(SendHorizontal),
  ChevronLeft: lucide(ChevronLeft),
  ChevronRight: lucide(ChevronRight),
  Shield: lucide(ShieldCheck),
  Smile: lucide(Smile),
  Paperclip: lucide(Paperclip),
  DoubleCheck: lucide(CheckCheck),
  Photo: lucide(Image),
  Mic: lucide(Mic),
  Play: lucide(Play),
  Pause: lucide(Pause),
  Stop: lucide(Square),
  Globe: lucide(Globe),
  Folder: lucide(Folder),
  Lock: lucide(Lock),
  ChevronUp: lucide(ChevronUp),
  History: lucide(History),
  Paw: lucide(PawPrint),
  Apple: lucide(Apple),
  Plane: lucide(Plane),
  Trophy: lucide(Trophy),
  Lightbulb: lucide(Lightbulb),
  Heart: lucide(Heart),
  Flag: lucide(Flag),
  Bell: lucide(Bell),
  CalendarPlus: lucide(CalendarPlus),
  ListChecks: lucide(ListChecks),
  Share: lucide(Share2),
  Hourglass: lucide(Hourglass),
  CircleCheck: lucide(CircleCheck),
  CircleX: lucide(CircleX),
  Timer: lucide(Timer),
  VerifiedSeal,
  Gmail,
  Instagram,
}

export default Icons
