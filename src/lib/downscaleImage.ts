/**
 * Потолок длинной стороны карты дистанции — совпадает с `MAX_DISTANCE_MAP_DIMENSION` в
 * `UploadService.kt` (eSport): бэкенд всё равно ужмёт карту до этого размера, поэтому слать
 * оригинал печатного разрешения (десятки мегабайт) — пустая трата трафика и времени.
 */
export const MAX_DISTANCE_MAP_SIDE = 2000

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/png')
  })
}

function drawScaled(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

/**
 * Уменьшает картинку так, чтобы длинная сторона была не больше `maxSide`, и возвращает PNG
 * (у карт тонкие линии и мелкий текст — JPEG дал бы на них артефакты). Пропорции сохраняются,
 * поэтому координаты углов карты остаются верными. Если картинка и так не больше `maxSide` или
 * браузер не смог её обработать — возвращается исходный файл (бэкенд ужмёт его сам).
 *
 * Уменьшение в два шага через промежуточный холст не больше `2 × maxSide`: одиночный `drawImage`
 * с кратным уменьшением в части браузеров даёт «рваные» линии, а холст размером с оригинал
 * упёрся бы в лимит площади холста в Safari (~16,7 Мп).
 */
export async function downscaleImageFile(file: File, maxSide: number): Promise<File> {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
    const longSide = Math.max(bitmap.width, bitmap.height)
    if (longSide <= maxSide) return file

    const size = (side: number, scale: number) => Math.max(1, Math.round(side * scale))
    const finalScale = maxSide / longSide
    let source: CanvasImageSource = bitmap
    if (longSide > maxSide * 2) {
      const stepScale = (maxSide * 2) / longSide
      source = drawScaled(bitmap, size(bitmap.width, stepScale), size(bitmap.height, stepScale))
    }
    const canvas = drawScaled(source, size(bitmap.width, finalScale), size(bitmap.height, finalScale))

    const blob = await canvasToPngBlob(canvas)
    if (blob.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]*$/, '') || 'map'
    return new File([blob], `${baseName}.png`, { type: 'image/png' })
  } catch {
    return file
  } finally {
    bitmap?.close()
  }
}
