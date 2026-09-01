export function CoursifyMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 4h9l-6.5 12L15 28H6L11.5 16 6 4Z"
        fill="var(--color-navy)"
      />
      <path
        d="M17 4h9l-6.5 12L26 28h-9l5.5-12L17 4Z"
        fill="var(--color-navy)"
        fillOpacity="0.42"
      />
    </svg>
  )
}

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <CoursifyMark
        className={`h-7 w-7 ${light ? "[&_path]:!fill-white" : ""}`}
      />
      <span
        className={`font-display text-[19px] font-bold tracking-[-0.03em] ${
          light ? "text-white" : "text-ink"
        }`}
      >
        Coursify
      </span>
    </div>
  )
}
