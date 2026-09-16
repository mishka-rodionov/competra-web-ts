import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { ErrorMessage } from '../../components/ErrorMessage'
import { cropImageToBlob } from '../../lib/cropImage'

interface AvatarCropDialogProps {
  imageSrc: string
  uploading: boolean
  error: string | null
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

/**
 * uploading/error приходят от родителя (а не локальный стейт) — иначе после ошибки загрузки
 * (например, 401) диалог не узнаёт об исходе и зависает на "Загрузка…" навсегда, а сообщение
 * об ошибке, отрисованное родителем под этим fullscreen-оверлеем, никогда не становится видимым.
 */
export function AvatarCropDialog({ imageSrc, uploading, error, onConfirm, onCancel }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    const blob = await cropImageToBlob(imageSrc, croppedAreaPixels)
    onConfirm(blob)
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-fg/80">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
        />
      </div>
      <div className="flex flex-col gap-3 bg-surface p-4">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
        {error && <ErrorMessage message={error} />}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="flex-1 rounded-md border border-outline px-4 py-2 text-sm text-fg disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={uploading || !croppedAreaPixels}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            {uploading ? 'Загрузка…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
