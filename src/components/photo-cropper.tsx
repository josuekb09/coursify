import Icons from "@/components/icons"
import { useEffect, useRef, useState } from "react"

const SIZE = 192

function exportCrop(image: HTMLImageElement, zoom: number, panX: number, panY: number) {
  const canvas = document.createElement("canvas")
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""
  const scale = Math.max(SIZE / image.width, SIZE / image.height) * zoom
  const drawW = image.width * scale
  const drawH = image.height * scale
  const x = (SIZE - drawW) / 2 + panX
  const y = (SIZE - drawH) / 2 + panY
  ctx.fillStyle = "#eef1f7"
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.drawImage(image, x, y, drawW, drawH)
  return canvas.toDataURL("image/jpeg", 0.72)
}

export default function PhotoCropper({
  onApply,
  onCancel,
}: {
  onApply: (dataUrl: string) => void
  onCancel: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!source) {
      setImage(null)
      return
    }
    const img = new Image()
    img.onload = () => setImage(img)
    img.src = source
  }, [source])

  function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > 8_000_000) {
      setError("Please keep the photo under 8 MB.")
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      setSource(String(reader.result))
      setZoom(1)
      setPanX(0)
      setPanY(0)
    }
    reader.readAsDataURL(file)
  }

  function apply() {
    if (!image) {
      setError("Choose a photo first.")
      return
    }
    const data = exportCrop(image, zoom, panX, panY)
    if (!data) {
      setError("Could not process that image.")
      return
    }
    onApply(data)
  }

  return (
    <div className="rounded-xl border border-line bg-canvas p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        Profile photo
      </p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="grid h-40 w-40 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-navy-soft">
          {source ? (
            <img
              src={source}
              alt=""
              className="h-full w-full object-cover"
              style={{
                transform: `scale(${zoom}) translate(${panX / 8}px, ${panY / 8}px)`,
              }}
            />
          ) : (
            <span className="px-4 text-center text-[12px] text-muted">No photo selected</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => onFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink hover:border-line-strong"
          >
            Choose photo
          </button>
          {source ? (
            <>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Zoom
                </span>
                <input
                  type="range"
                  min={1}
                  max={2.4}
                  step={0.05}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full accent-navy"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Horizontal
                </span>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={panX}
                  onChange={(event) => setPanX(Number(event.target.value))}
                  className="w-full accent-navy"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Vertical
                </span>
                <input
                  type="range"
                  min={-80}
                  max={80}
                  value={panY}
                  onChange={(event) => setPanY(Number(event.target.value))}
                  className="w-full accent-navy"
                />
              </label>
            </>
          ) : null}
          {error ? <p className="text-sm text-[#8a3b32]">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={apply}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-[13px] font-semibold text-white hover:bg-navy-hover"
            >
              <Icons.Check className="h-3.5 w-3.5" />
              Use photo
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-line px-3 py-2 text-[13px] font-medium text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
