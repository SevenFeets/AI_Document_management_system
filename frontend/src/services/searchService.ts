import { api } from './api'
import { SearchResult } from '../store/slices/searchSlice'

export const searchService = {
  search: async (query: string): Promise<SearchResult[]> => {
    const response = await api.get('/search', {
      params: { q: query },
    })
    return response.data
  },

  summarize: async (documentId: string, query: string): Promise<string> => {
    const response = await api.post('/search/summarize', {
      documentId,
      query,
    })
    return response.data.summary
  },
}
