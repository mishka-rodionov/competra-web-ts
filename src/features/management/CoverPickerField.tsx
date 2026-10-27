import { useEffect, useState } from 'react'
import { uploadRepository } from '../../api/uploadRepository'
import { AvatarCropDialog } from '../profile/AvatarCropDialog'

const COVER_ASPECT = 16 / 9
const COVER_WIDTH_PX = 1600

interface CoverPickerFieldProps {
  imageUrl: string | null
  onChange: (imageUrl: string | null) => void
}

/**
 * Обложка соревнования: выбор файла → кроп 16:9 → загрузка на `/upload/file` (type `competition_image`).
 * В отличие от Android, загружается уже обрезанная картинка, поэтому рамка кропа не нужна.
 */
export function CoverPickerField({ imageUrl, onChange }: CoverPickerFieldProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    }
  }, [sourceUrl])

  async function handleConfirm(blob: Blob) {
    setUploading(true)
    setError(null)
    const result = await uploadRepository.uploadFile(blob, 'cover.jpg', 'competition_image')
    setUploading(false)
    if (result.kind === 'error') {
      setError(result.message)
      return
    }
    onChange(result.data)
    setSourceUrl(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-on-surface-variant">Обложка соревнования</span>
      {imageUrl && <img src={imageUrl} alt="" className="aspect-video w-full rounded-lg object-cover" />}
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer rounded-md border border-outline px-4 py-2 text-center text-sm text-fg">
          {imageUrl ? 'Изменить обложку' : 'Выбрать обложку'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) setSourceUrl(URL.createObjectURL(file))
            }}
          />
        </label>
        {imageUrl && (
          <button type="button" onClick={() => onChange(null)} className="px-2 text-sm text-error">
            Убрать
          </button>
        )}
      </div>
      {sourceUrl && (
        <AvatarCropDialog
          imageSrc={sourceUrl}
          uploading={uploading}
          error={error}
          aspect={COVER_ASPECT}
          outputSize={COVER_WIDTH_PX}
          onConfirm={handleConfirm}
          onCancel={() => {
            setSourceUrl(null)
            setError(null)
          }}
        />
      )}
    </div>
  )
}
