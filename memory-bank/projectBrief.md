# Project Brief

## Project Name

AI-Powered Document Search & Summarization System

## Core Objective

Build a document management platform where users can upload documents, search them with full-text search, and generate AI-powered summaries using RAG (Retrieval-Augmented Generation).

## Key Requirements

### Functional

- Document upload (drag & drop) supporting PDF, DOC, DOCX, TXT
- Automatic text extraction and parsing
- Full-text search via Elasticsearch
- AI summarization via LangChain + OpenAI
- Asynchronous document processing (job queue)
- Document CRUD (list, view, delete)
- AWS S3 storage for uploaded files

### Non-Functional

- Scalable architecture (Docker, optional Kubernetes)
- Monitoring via Grafana
- CI/CD via GitHub Actions
- Infrastructure as Code via Terraform

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Redux Toolkit, Tailwind, Vite |
| Backend | NestJS, TypeORM, PostgreSQL |
| Search | Elasticsearch 8.x |
| Queue | Bull (Redis) |
| AI | LangChain, OpenAI |
| Storage | AWS S3 |
| Infra | Docker, Kubernetes, Terraform, AWS |

## Project Structure

```
├── backend/       # NestJS API
├── frontend/      # React SPA
├── kubernetes/    # K8s manifests
├── terraform/     # AWS IaC
├── monitoring/    # Grafana configs
└── docker-compose.yml
```

## API Endpoints (Core)

- `GET /api/documents` — List documents
- `GET /api/documents/:id` — Get document
- `POST /api/documents/upload` — Upload document
- `DELETE /api/documents/:id` — Delete document
- `GET /api/search?q=query` — Search
- `POST /api/search/summarize` — AI summary

## Development Phases (from ROADMAP)

1. **Setup** — Dependencies, env, Docker
2. **Core Backend** — Parser, upload, queue, search, AI
3. **Frontend Integration** — API wiring, UI polish
4. **AWS Integration** — S3, Lambda, production config
5. **Testing & QA**
6. **Infrastructure & Deployment** — Terraform, CI/CD, K8s
7. **Monitoring & Polish** — Grafana, logging, docs

## Constraints

- Node.js 18+
- OpenAI API key required for summarization
- AWS credentials required for S3 (can mock locally initially)

## License

MIT
