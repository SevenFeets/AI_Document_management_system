import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { searchService } from '../../services/searchService'

export interface SearchResult {
  id: string
  title: string
  filename: string
  snippet: string
  score: number
  metadata?: Record<string, any>
}

interface SearchState {
  query: string
  results: SearchResult[]
  loading: boolean
  error: string | null
  hasSearched: boolean
  /** Summary text keyed by document id (from "AI Summarize" on search results) */
  documentSummaries: Record<string, string>
}

const initialState: SearchState = {
  query: '',
  results: [],
  loading: false,
  error: null,
  hasSearched: false,
  documentSummaries: {},
}

export const searchDocuments = createAsyncThunk(
  'search/searchDocuments',
  async (query: string) => {
    return await searchService.search(query)
  }
)

export const summarizeDocument = createAsyncThunk(
  'search/summarizeDocument',
  async ({ documentId, query }: { documentId: string; query: string }) => {
    return await searchService.summarize(documentId, query)
  }
)

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload
    },
    clearResults: (state) => {
      state.results = []
      state.hasSearched = false
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchDocuments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchDocuments.fulfilled, (state, action) => {
        state.loading = false
        state.results = action.payload
        state.hasSearched = true
      })
      .addCase(searchDocuments.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Search failed'
      })
      .addCase(summarizeDocument.fulfilled, (state, action) => {
        const { documentId } = action.meta.arg
        state.documentSummaries[documentId] = action.payload
      })
  },
})

export const { setQuery, clearResults, clearError } = searchSlice.actions
export default searchSlice.reducer
