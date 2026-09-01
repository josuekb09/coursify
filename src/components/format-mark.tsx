import Icons from "@/components/icons"
import type { ResourceFormat } from "@/types"

const iconMap = {
  video: Icons.Film,
  slides: Icons.Slides,
  document: Icons.File,
  spreadsheet: Icons.Table,
  code: Icons.Code,
}

export default function FormatMark({
  format,
  className = "h-4 w-4",
}: {
  format: ResourceFormat
  className?: string
}) {
  const Icon = iconMap[format]
  return <Icon className={className} />
}
