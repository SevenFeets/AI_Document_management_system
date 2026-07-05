# Product Context

## Why This Project Exists

Organizations and individuals accumulate documents (PDFs, Word files, plain text) that are hard to search and summarize manually. This system provides a single place to upload, store, search, and get AI-generated summaries from document content.

## Problems It Solves

- **Discovery:** Finding relevant information across many documents via full-text search (Elasticsearch)
- **Comprehension:** Quickly understanding document content through AI summarization (LangChain + RAG + OpenAI)
- **Scale:** Handling uploads and processing asynchronously so the UI stays responsive (Bull/Redis queue)
- **Persistence:** Reliable storage of files (AWS S3) and metadata (PostgreSQL)

## How It Should Work (User Experience)

1. **Upload** — User drags and drops or selects a document (PDF, DOC, DOCX, TXT)
2. **Process** — System stores the file, extracts text, generates a summary, and indexes content for search (background job)
3. **Browse** — User sees a list of documents with status (processing, indexed, etc.)
4. **Search** — User enters keywords; results ranked by relevance
5. **Summarize** — User can request an AI summary for a specific document or query context

## Target Users

- Developers and teams managing technical documentation
- Anyone needing searchable document archives with optional AI assistance

## UX Goals

- Simple, modern UI (React + Tailwind)
- Clear feedback during upload and processing (loading states, toasts)
- Fast search results
- Accessible document detail view with summary

## Success Metrics

- Upload → indexed document in reasonable time
- Search returns relevant results quickly
- AI summaries are contextually useful
- System runs locally via Docker and deploys to cloud (AWS/Kubernetes)

## Out of Scope (Current)

- Multi-tenant organization management
- Real-time collaborative editing
- Advanced auth/SSO (planned but not implemented)
