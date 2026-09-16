import { authRequest } from './client'
import { safeApiCall } from './safeApiCall'

interface UploadResponse {
  url: string
}

export const uploadRepository = {
  /** POST /upload/file — общий эндпоинт для аватаров и обложек соревнований, различаются только `type`. */
  async uploadFile(file: Blob, fileName: string, type: 'avatar' | 'competition_image') {
    const formData = new FormData()
    formData.append('file', file, fileName)
    formData.append('type', type)
    const result = await safeApiCall<UploadResponse>(() => authRequest('/upload/file', { method: 'POST', body: formData }))
    if (result.kind === 'error') return result
    return { kind: 'success' as const, data: result.data.url }
  },
}
