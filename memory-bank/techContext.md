# Tech Context

## Stack Versions (Key Dependencies)

### Backend

| Package | Version | Notes |
|---------|---------|-------|
| `@nestjs/core` | ^10.2.10 | NestJS v10 |
| `typeorm` | ^0.3.17 | Use DataSource (v0.3.x API) |
| `langchain` | ^1.2.10 | v1.x — breaking changes from v0.x |
| `@langchain/openai` | ^1.2.2 | OpenAI integration |
| `bull` / `@nestjs/bull` | ^4.11.5 / ^10.0.1 | Redis queue |
| `@aws-sdk/client-s3` | ^3.490.0 | AWS SDK v3 (modular) |
| `pdf-parse`, `mammoth` | ^1.1.1, ^1.6.0 | PDF and DOCX parsing |

### Frontend

| Package | Version | Notes |
|---------|---------|-------|
| `react` / `react-dom` | ^18.2.0 | React 18 |
| `@reduxjs/toolkit` | ^2.0.1 | State management |
| `vite` | ^5.0.8 | Build tool |
| `tailwindcss` | ^3.3.6 | Styling |
| `axios` | ^1.6.2 | HTTP client |
| `react-router-dom` | ^6.20.0 | Routing |

### Infrastructure (Docker)

| Service | Image/Version |
|---------|---------------|
| PostgreSQL | 15-alpine |
| Redis | 7-alpine |
| Elasticsearch | 8.11.0 |
| RabbitMQ | 3-management-alpine |
| Grafana | latest |

### Node.js

- **Recommended:** 18.x or 20.x LTS
- Backend target: ES2021
- Frontend target: ES2020

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- OpenAI API key (for summarization)
- AWS credentials (for S3; optional for local dev)

### Environment Variables

**Backend (`backend/.env`):**

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=document_search
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://localhost:9200
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=document-search
OPENAI_API_KEY=...
PORT=4000
FRONTEND_URL=http://localhost:3000
```

**Frontend (`frontend/.env`):**

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### Quick Start Commands

```bash
# Start all services
docker-compose up -d

# Backend (local)
cd backend && npm install && npm run start:dev

# Frontend (local)
cd frontend && npm install && npm run dev
```

### Local URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Grafana | http://localhost:3001 (admin/admin) |
| RabbitMQ | http://localhost:15672 (admin/admin) |

## Tooling

- **Lint:** ESLint (backend + frontend)
- **Format:** Prettier (backend)
- **Tests:** Jest (backend) — `npm test` in `backend/`
- **IaC:** Terraform in `terraform/`
- **CI/CD:** GitHub Actions in `.github/workflows/ci-cd.yml`

## Technical Constraints

- TypeORM 0.3.x requires DataSource pattern (not legacy Connection)
- LangChain 1.x has different API than 0.x
- Elasticsearch 8.x needs security config in production
- AWS SDK v3 uses modular imports (not monolithic v2)

## Migration Notes

When upgrading:

- **TypeORM 0.2 → 0.3:** Update DataSource usage
- **LangChain 0.x → 1.x:** Follow migration guide
- **AWS SDK v2 → v3:** Change import and API patterns
- **Lambda function** still uses AWS SDK v2 — consider migrating to v3

## Related Documentation

- `.cursor/rules/tech-stack.mdc` — Detailed dependency best practices
- `.cursor/rules/project-structure.mdc` — Directory layout
- `ARCHITECTURE.md` — System design
- `DEPLOYMENT.md` — Deployment procedures
