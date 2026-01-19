import { api } from './api'
import { Document } from '../store/slices/documentsSlice'

export const documentService = {
  getAllDocuments: async (): Promise<Document[]> => {
    const response = await api.get('/documents')
    return response.data
  },

  getDocumentById: async (id: string): Promise<Document> => {
    const response = await api.get(`/documents/${id}`)
    return response.data
  },

  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`)
  },
}
