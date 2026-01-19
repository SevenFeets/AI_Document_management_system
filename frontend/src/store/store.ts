import { configureStore } from '@reduxjs/toolkit'
import documentsReducer from './slices/documentsSlice'
import searchReducer from './slices/searchSlice'
import uploadReducer from './slices/uploadSlice'

export const store = configureStore({
  reducer: {
    documents: documentsReducer,
    search: searchReducer,
    upload: uploadReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
