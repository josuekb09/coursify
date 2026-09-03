import type { Educator } from "@/types"

export default function Avatar({
  educator,
  size = 32,
  className = "",
  rounded = "rounded-md",
}: {
  educator: Pick<Educator, "name" | "initials" | "photoData">
  size?: number
  className?: string
  rounded?: string
}) {
  const dim = `${size}px`
  if (educator.photoData) {
    return (
      <img
        key={educator.photoData.slice(0, 80)}
        src={educator.photoData}
        alt=""
        width={size}
        height={size}
        className={`${rounded} bg-navy-soft object-cover ${className}`}
        style={{ width: dim, height: dim }}
      />
    )
  }
  return (
    <span
      className={`grid place-items-center bg-navy font-display font-semibold text-white ${rounded} ${className}`}
      style={{ width: dim, height: dim, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden="true"
    >
      {educator.initials}
    </span>
  )
}
