# Technical Stack

Complete technology inventory for the **AI-Powered Document Search & Summarization** project.

**Legend**

| Status | Meaning |
|--------|---------|
| **In use** | Implemented and active in the codebase or infrastructure |
| **Optional** | Available in dependencies or Docker Compose but not required for core flow |
| **Planned** | Documented target; not yet implemented |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend — React 18, Vite, Redux Toolkit, Tailwind CSS         │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST (Axios)
┌────────────────────────────▼────────────────────────────────────┐
│  Backend — NestJS 10, TypeScript, TypeORM                       │
└──┬─────────┬──────────────┬────────────┬────────────┬───────────┘
   │         │              │            │            │
   ▼         ▼              ▼            ▼            ▼
PostgreSQL Elasticsearch   Redis       AWS S3    LangChain / LLM
(metadata)  (search)     (Bull queue)  (files)   (summaries)
```

---

## Languages & Runtime

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **TypeScript** | 5.2.x | In use | Backend and frontend language |
| **Node.js** | 18.x LTS | In use | Backend runtime, build tooling, CI |
| **JavaScript** | ES2020–2021 | In use | Lambda function, config files |

---

## Frontend

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **React** | 18.2.x | In use | UI library |
| **React DOM** | 18.2.x | In use | DOM rendering |
| **Vite** | 5.0.x | In use | Dev server and production build |
| **React Router** | 6.20.x | In use | Client-side routing |
| **Redux Toolkit** | 2.0.x | In use | Global state management |
| **React Redux** | 9.0.x | In use | React bindings for Redux |
| **Axios** | 1.6.x | In use | HTTP client for backend API |
| **Tailwind CSS** | 3.3.x | In use | Utility-first styling |
| **PostCSS** | 8.4.x | In use | CSS processing |
| **Autoprefixer** | 10.4.x | In use | CSS vendor prefixes |
| **react-dropzone** | 14.2.x | In use | Drag-and-drop file upload |
| **react-hot-toast** | 2.4.x | In use | Toast notifications |
| **lucide-react** | 0.294.x | In use | Icons |
| **Nginx** | alpine (Docker) | In use | Serves production frontend build |
| **CDN** | — | Planned | Static asset delivery in production |

---

## Backend

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **NestJS** | 10.2.x | In use | REST API framework |
| **Express** | via `@nestjs/platform-express` | In use | HTTP adapter |
| **TypeORM** | 0.3.x | In use | PostgreSQL ORM |
| **class-validator** | 0.14.x | In use | DTO validation |
| **class-transformer** | 0.5.x | In use | DTO transformation |
| **Multer** | 1.4.x | In use | Multipart file uploads |
| **RxJS** | 7.8.x | In use | Reactive streams (NestJS) |
| **@nestjs/config** | 3.3.x | In use | Environment configuration |
| **@nestjs/microservices** | 10.2.x | In use | Microservices support (dependency present) |
| **Jest** | 29.7.x | In use | Unit and integration tests |
| **Supertest** | 6.3.x | In use | HTTP assertion testing |
| **ESLint** | 8.x | In use | Linting |
| **Prettier** | 3.1.x | In use | Code formatting |

---

## Databases & Search

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **PostgreSQL** | 15 (Alpine) | In use | Primary database — document metadata, status, extracted text |
| **pg** | 8.11.x | In use | Node.js PostgreSQL driver |
| **Elasticsearch** | 8.11.0 | In use | Full-text search index |
| **@nestjs/elasticsearch** | 10.0.x | In use | NestJS Elasticsearch client |
| **MongoDB** | — | Optional | Listed in dependencies (`mongoose`, `@nestjs/mongoose`) — not used in core flow |
| **mongoose** | 8.0.x | Optional | MongoDB ODM (dependency present) |

---

## Queue & Messaging

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **Redis** | 7 (Alpine) | In use | Bull queue backend, caching |
| **Bull** | 4.11.x | In use | Primary async job queue (document processing) |
| **@nestjs/bull** | 10.0.x | In use | NestJS Bull integration |
| **RabbitMQ** | 3 (management) | Optional | Message broker in Docker Compose; `amqplib` in dependencies |
| **amqplib** | 0.10.x | Optional | RabbitMQ client |

---

## AI & Document Processing

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **LangChain** | 1.2.x | In use | LLM orchestration framework |
| **@langchain/core** | (transitive) | In use | Prompts, chains, output parsers |
| **@langchain/openai** | 1.2.x | In use | OpenAI chat models |
| **@langchain/groq** | 1.0.x | In use | Groq chat models (default `AI_PROVIDER`) |
| **@langchain/community** | 1.1.x | In use | Community LangChain integrations |
| **OpenAI GPT** | API | In use | Summarization (configurable provider) |
| **Groq** | API | In use | Default LLM provider for summaries |
| **RAG** | — | In use | Retrieval-augmented generation pattern for context-aware summaries |
| **pdf-parse** | 1.1.x | In use | PDF text extraction |
| **mammoth** | 1.6.x | In use | DOCX text extraction |
| **Google Gemini** | — | Planned | Commented in `ai.service.ts` |
| **Ollama** | — | Planned | Local LLM option (commented in `ai.service.ts`) |

### Supported document formats

| Format | Parser |
|--------|--------|
| PDF | pdf-parse |
| DOCX | mammoth |
| DOC | mammoth |
| TXT | native read |

---

## Cloud — AWS

| Service / SDK | Version | Status | Purpose |
|---------------|---------|--------|---------|
| **Amazon S3** | — | In use | Document file storage |
| **@aws-sdk/client-s3** | 3.x | In use | S3 upload, download, delete |
| **@aws-sdk/s3-request-presigner** | 3.x | In use | Presigned URLs |
| **AWS Lambda** | — | In use | Serverless document processing (Terraform) |
| **@aws-sdk/client-lambda** | 3.x | In use | Lambda invocation from backend |
| **aws-sdk** (v2) | 2.1500.x | In use | Lambda function runtime package |
| **Amazon EC2** | — | In use | Application hosting (Terraform) |
| **Amazon VPC** | — | In use | Network isolation (Terraform) |
| **Security Groups** | — | In use | Firewall rules (Terraform) |
| **Amazon ECR** | — | Optional | Container registry for production images |
| **IAM** | — | In use | AWS access control |
| **S3 (Terraform state)** | — | In use | Remote Terraform state bucket |

---

## Infrastructure & DevOps

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **Docker** | — | In use | Containerization |
| **Docker Compose** | — | In use | Local multi-service stack |
| **Terraform** | ≥ 1.0 (CI: 1.6.0) | In use | AWS infrastructure as code |
| **HashiCorp AWS Provider** | ~> 5.0 | In use | Terraform AWS resources |
| **Kubernetes (kubectl)** | — | In use | Production orchestration (manifests in `kubernetes/`) |
| **GitHub Actions** | — | In use | CI/CD — lint, test, build, deploy |
| **Git** | — | In use | Version control |

### Docker Compose services (local)

| Service | Image |
|---------|-------|
| PostgreSQL | `postgres:15-alpine` |
| Redis | `redis:7-alpine` |
| Elasticsearch | `elasticsearch:8.11.0` |
| RabbitMQ | `rabbitmq:3-management-alpine` |
| Grafana | `grafana/grafana:latest` |

### Kubernetes deployments

| Workload | File |
|----------|------|
| Backend API | `kubernetes/backend-deployment.yaml` |
| Frontend | `kubernetes/frontend-deployment.yaml` |
| Elasticsearch | `kubernetes/elasticsearch-deployment.yaml` |

---

## Monitoring & Observability

| Technology | Version | Status | Purpose |
|------------|---------|--------|---------|
| **Grafana** | latest | In use | Dashboards and visualization |
| **Grafana Redis datasource plugin** | — | In use | Redis metrics |
| **PostgreSQL datasource** | — | In use | DB metrics (Grafana provisioning) |
| **Structured logging** | — | Planned | Centralized log aggregation |
| **Health check endpoint** | — | Planned | `GET /api/health` (noted in DEPLOYMENT.md) |

---

## Security

| Technology | Status | Purpose |
|------------|--------|---------|
| **JWT** | Planned | API authentication |
| **Passport.js** | Planned | NestJS auth strategy (via `@nestjs/passport`, not yet added) |
| **RBAC** | Planned | Role-based access control |
| **bcrypt** | Planned | Password hashing |
| **CORS** | In use | Configured in `backend/src/main.ts` |
| **S3 server-side encryption** | Planned | At-rest encryption for files |
| **VPC + security groups** | In use | Network isolation (Terraform) |
| **Environment variables / K8s secrets** | In use | Secret management |
| **HTTPS / TLS** | Planned | Production transport encryption |
| **Rate limiting** | Planned | API abuse prevention |

---

## Development Tools

| Tool | Status | Purpose |
|------|--------|---------|
| **Cursor IDE** | In use | AI-assisted development |
| **Cursor rules** | In use | Project conventions (`.cursor/rules/`) |
| **Cursor skills** | In use | Domain patterns (`.cursor/skills/`) |
| **Memory bank** | In use | Agent session context (`memory-bank/`) |
| **ESLint** | In use | Backend and frontend linting |
| **Prettier** | In use | Backend formatting |
| **ts-jest** | In use | TypeScript test compilation |

---

## API & Communication

| Pattern | Status | Details |
|---------|--------|---------|
| **REST API** | In use | NestJS controllers under `/api/*` |
| **Multipart upload** | In use | `POST /api/documents/upload` |
| **Async jobs** | In use | Bull queue `document-processing` |
| **WebSockets** | — | Not used |
| **GraphQL** | — | Not used |

---

## Version Compatibility Notes

- **NestJS 10** requires **TypeScript 5.x** and **Node 18+**
- **TypeORM 0.3.x** uses `DataSource` (breaking change from 0.2.x)
- **LangChain 1.x** has breaking API changes from 0.x
- **AWS SDK v3** (backend) is modular; Lambda function still uses **AWS SDK v2**
- **Elasticsearch 8.x** requires security configuration in production
- **Vite env vars** must use the `VITE_` prefix

---

## Related Documentation

| Document | Contents |
|----------|----------|
| [README.md](README.md) | Project overview and quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and data flows |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy procedures |
| [memory-bank/techContext.md](memory-bank/techContext.md) | Agent-oriented tech context |
| [.cursor/rules/tech-stack.mdc](.cursor/rules/tech-stack.mdc) | Dependency best practices (Cursor rule) |

---

*Last updated from `package.json`, `docker-compose.yml`, Terraform, and architecture docs.*
