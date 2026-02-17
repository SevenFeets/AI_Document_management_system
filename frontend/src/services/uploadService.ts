import { api } from './api'

export const uploadService = {
  uploadFile: async (file: File): Promise<{ id: string; message: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          // Progress calculation - handled by Redux slice
          Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }
      },
    })

    return response.data
  },
}
