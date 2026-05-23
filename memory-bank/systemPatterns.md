# System Patterns

## Architecture Overview

Microservices-oriented, cloud-native design with a React SPA, NestJS REST API, and supporting data/search/queue services.

```
Frontend (React) → Backend (NestJS) → PostgreSQL | Elasticsearch | Redis | S3
                                      ↓
                              Bull Queue → Document Processor
                                      ↓
                              AI Service (LangChain)
```

## Backend Patterns (NestJS)

### Module-Per-Feature

Each domain has its own NestJS module with controller, service, and optional submodule:

| Module | Responsibility |
|--------|----------------|
| `documents` | CRUD, metadata, parsing orchestration |
| `upload` | File upload handling |
| `search` | Elasticsearch queries, summarize endpoint |
| `ai` | LangChain + OpenAI integration |
| `elasticsearch` | Index management, document indexing |
| `queue` | Bull job enqueueing and processors |
| `s3` | AWS S3 file operations |
| `database` | TypeORM entities and connection |

### Dependency Injection

Services are `@Injectable()` and injected via constructors. Modules export services for cross-module use.

### Async Processing

Document upload triggers a queue job (`document.processor.ts`):

1. Download from S3
2. Parse text (`document-parser.service.ts`)
3. Generate AI summary
4. Index in Elasticsearch
5. Update document status in PostgreSQL

## Frontend Patterns (React)

### Layered Structure

- **Pages** — Route-level components (`Dashboard`, `DocumentUpload`, `DocumentSearch`, `DocumentDetail`)
- **Components** — Reusable UI (`Layout`)
- **Services** — API clients (`api.ts`, `documentService`, `searchService`, `uploadService`)
- **Store** — Redux Toolkit slices (`documentsSlice`, `searchSlice`, `uploadSlice`)

### State Management

Redux Toolkit `createSlice` for documents, search, and upload state. Services call backend REST API via axios.

## Data Flow Patterns

### Upload Flow

```
User → Frontend → POST /upload → S3 + PostgreSQL metadata → Queue job → Worker → ES index + AI summary
```

### Search Flow

```
User query → Frontend → GET /search?q= → Elasticsearch → Ranked results → Optional POST /search/summarize
```

## Infrastructure Patterns

### Local Development

`docker-compose.yml` orchestrates PostgreSQL, Redis, Elasticsearch, RabbitMQ, backend, frontend, Grafana.

### Production

- **Terraform** — VPC, EC2, S3, Lambda, security groups
- **Kubernetes** — Separate deployments for backend, frontend, Elasticsearch
- **CI/CD** — GitHub Actions: lint, test, build Docker images, deploy

### Monitoring

Grafana dashboards for upload rates, search metrics, queue status, system health.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary DB | PostgreSQL + TypeORM | Relational metadata, migrations |
| Search | Elasticsearch | Full-text, relevance scoring |
| Queue | Bull + Redis | NestJS-native, simple async jobs |
| File storage | S3 | Scalable, versioning support |
| AI | LangChain + OpenAI RAG | Context-aware summarization |
| Auth | JWT (planned) | Standard for REST APIs |

## Naming Conventions

- **Backend files:** kebab-case (`documents.service.ts`)
- **Frontend components:** PascalCase (`DocumentUpload.tsx`)
- **Frontend utilities:** camelCase

## Security Patterns (Planned / Partial)

- Environment variables for secrets (never committed)
- S3 server-side encryption
- VPC + security groups (Terraform)
- JWT + RBAC — not yet implemented

## Scalability Patterns

- Horizontal scaling of backend via Kubernetes replicas
- Elasticsearch clustering
- Multiple queue workers for parallel document processing
- Redis caching for hot data
