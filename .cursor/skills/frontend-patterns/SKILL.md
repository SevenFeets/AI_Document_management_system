---
name: frontend-patterns
description: >-
  React frontend conventions for the Document Search project. Use when building
  pages, components, Redux slices, API services, routing, or Tailwind UI in the
  frontend/ directory.
---

# Frontend Patterns

## Stack

React 18 + TypeScript + Vite + Redux Toolkit + React Router v6 + Tailwind CSS + Axios.

Entry: `frontend/src/main.tsx` → `App.tsx` with routes inside `Layout`.

## Directory Layout

```
frontend/src/
├── pages/           # Route-level components (PascalCase)
├── components/      # Reusable UI (Layout/, etc.)
├── services/        # API clients (one per domain)
├── store/
│   ├── store.ts     # configureStore
│   └── slices/      # Redux Toolkit slices
└── App.tsx          # Routes
```

## Routing

Routes in `App.tsx`:

| Path | Page |
|------|------|
| `/` | Dashboard |
| `/upload` | DocumentUpload |
| `/search` | DocumentSearch |
| `/documents/:id` | DocumentDetail |

Wrap new pages in `<Layout>` for consistent nav/chrome.

## API Service Layer

Base client: `frontend/src/services/api.ts`

- `VITE_API_BASE_URL` env var (default `http://localhost:4000/api`)
- Response interceptor normalizes errors to `Error(message)`

Domain services import `api` and return typed promises:

```typescript
// services/documentService.ts
export const documentService = {
  getAllDocuments: async (): Promise<Document[]> => {
    const response = await api.get('/documents')
    return response.data
  },
}
```

**Do not** call axios directly from components — go through services.

### Multipart uploads

Use `FormData` + `Content-Type: multipart/form-data` (see `uploadService.ts`). Support `onUploadProgress` for progress bars.

## Redux Pattern

### Store setup (`store/store.ts`)

One reducer per domain slice: `documents`, `search`, `upload`.

Export `RootState` and `AppDispatch` types.

### Slice structure

```typescript
// 1. Define state interface + initialState
// 2. createAsyncThunk for API calls (delegates to service)
// 3. createSlice with reducers + extraReducers for thunk lifecycle
// 4. Export actions + default reducer
```

Reference: `store/slices/documentsSlice.ts`

**Loading states:** `pending`/`fulfilled`/`rejected` in `extraReducers`.

**Silent refresh:** separate thunks (`refreshDocumentsSilently`) that update data without toggling `loading` — used for polling processing status.

### Component usage

```typescript
const dispatch = useDispatch()
const { documents, loading, error } = useSelector((state: RootState) => state.documents)

useEffect(() => { dispatch(fetchDocuments() as any) }, [dispatch])
```

## Page Pattern

1. Import hooks (`useDispatch`, `useSelector`) and slice thunks
2. Fetch data in `useEffect` on mount
3. Show loading/error states from slice
4. User feedback via `react-hot-toast`
5. Tailwind utility classes for styling (`card`, `border-primary-500`, etc.)

### File upload pages

Use `react-dropzone` with `accept` matching backend validators (pdf, doc, docx, txt). Disable dropzone while `uploading`.

## Adding a New Feature

1. **Service** — `services/<feature>Service.ts` with typed methods
2. **Slice** — `store/slices/<feature>Slice.ts` with thunks
3. **Register** reducer in `store/store.ts`
4. **Page** — `pages/<Feature>.tsx`
5. **Route** — add to `App.tsx`
6. **Nav** — update `components/Layout/Layout.tsx` if needed

## Styling

- Tailwind utility-first; global styles in `index.css`
- Icons: `lucide-react` (tree-shake: import specific icons)
- Responsive: use Tailwind breakpoints (`sm:`, `md:`, `lg:`)

## Environment

```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:4000/api
```

Vite requires `VITE_` prefix. Rebuild after changing production values.

## Do Not

- Put API URLs hardcoded in components
- Store server state outside Redux without reason (local UI state is fine in `useState`)
- Use class components

## Related Files

| File | Reference |
|------|-----------|
| `frontend/src/services/api.ts` | Axios setup |
| `frontend/src/store/slices/documentsSlice.ts` | Slice + thunks |
| `frontend/src/pages/DocumentUpload.tsx` | Dropzone + dispatch |
| `frontend/src/App.tsx` | Routing |
