export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = src
  })
}

/**
 * Вырезает область croppedAreaPixels (react-easy-crop onCropComplete) в JPEG-blob шириной [outputSize]
 * и высотой outputSize / aspect (по умолчанию квадрат, как у аватара).
 */
export async function cropImageToBlob(
  imageSrc: string,
  croppedAreaPixels: PixelCrop,
  outputSize = 512,
  aspect = 1,
): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = Math.round(outputSize / aspect)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/jpeg', 0.9)
  })
}
