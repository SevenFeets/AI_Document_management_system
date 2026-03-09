import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { documentService } from '../../services/documentService'

export interface Document {
  id: string
  title: string
  filename: string
  fileType: string
  fileSize: number
  uploadDate: string
  summary?: string
  status: 'processing' | 'indexed' | 'error'
  metadata?: Record<string, any>
}

interface DocumentsState {
  documents: Document[]
  selectedDocument: Document | null
  loading: boolean
  error: string | null
}

const initialState: DocumentsState = {
  documents: [],
  selectedDocument: null,
  loading: false,
  error: null,
}

export const fetchDocuments = createAsyncThunk(
  'documents/fetchAll',
  async () => {
    return await documentService.getAllDocuments()
  }
)

export const fetchDocumentById = createAsyncThunk(
  'documents/fetchById',
  async (id: string) => {
    return await documentService.getDocumentById(id)
  }
)

// Silent refresh actions for polling (no loading state)
export const refreshDocumentsSilently = createAsyncThunk(
  'documents/refreshSilently',
  async () => {
    return await documentService.getAllDocuments()
  }
)

export const refreshDocumentByIdSilently = createAsyncThunk(
  'documents/refreshByIdSilently',
  async (id: string) => {
    return await documentService.getDocumentById(id)
  }
)

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setSelectedDocument: (state, action: PayloadAction<Document | null>) => {
      state.selectedDocument = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false
        state.documents = action.payload
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch documents'
      })
      .addCase(fetchDocumentById.fulfilled, (state, action) => {
        state.selectedDocument = action.payload
      })
      // Silent refresh - update data without loading state
      .addCase(refreshDocumentsSilently.fulfilled, (state, action) => {
        state.documents = action.payload
      })
      .addCase(refreshDocumentByIdSilently.fulfilled, (state, action) => {
        state.selectedDocument = action.payload
      })
  },
})

export const { setSelectedDocument, clearError } = documentsSlice.actions
export default documentsSlice.reducer
