import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { uploadService } from '../../services/uploadService'

interface UploadState {
  uploading: boolean
  progress: number
  error: string | null
  uploadedFiles: string[]
}

const initialState: UploadState = {
  uploading: false,
  progress: 0,
  error: null,
  uploadedFiles: [],
}

// Define thunk before slice using action type string to avoid circular reference
export const uploadDocument = createAsyncThunk(
  'upload/uploadDocument',
  async (file: File, { dispatch, rejectWithValue }) => {
    try {
      return await uploadService.uploadFile(file, (percent) => {
        // Dispatch using action type string to avoid circular reference
        dispatch({ type: 'upload/setProgress', payload: percent })
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      return rejectWithValue(message)
    }
  }
)

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    resetUpload: (state) => {
      state.uploading = false
      state.progress = 0
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadDocument.pending, (state) => {
        state.uploading = true
        state.progress = 0
        state.error = null
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.uploading = false
        state.progress = 100
        state.uploadedFiles.push(action.payload.id)
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.uploading = false
        state.error = action.payload as string || 'Upload failed'
      })
  },
})

export const { setProgress, clearError, resetUpload } = uploadSlice.actions
export default uploadSlice.reducer
