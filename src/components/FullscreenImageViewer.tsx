import { useEffect } from 'react'

interface FullscreenImageViewerProps {
  url: string
  onClose: () => void
}

/**
 * Простой модал без зума/пана (в отличие от Android, где кастомный viewer поддерживает
 * pinch-zoom) — для веба клика по картинке достаточно, чтобы увидеть её целиком.
 */
export function FullscreenImageViewer({ url, onClose }: FullscreenImageViewerProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-4 top-4 text-2xl text-white"
      >
        ✕
      </button>
      <img src={url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}
