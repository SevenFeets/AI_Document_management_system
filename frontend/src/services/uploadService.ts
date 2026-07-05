import { api } from './api'
import type { AxiosProgressEvent } from 'axios'

export const uploadService = {
  uploadFile: async (
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ id: string; message: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })

    return response.data
  },
}
