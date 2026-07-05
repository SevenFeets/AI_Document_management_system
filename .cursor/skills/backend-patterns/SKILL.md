---
name: backend-patterns
description: >-
  NestJS backend conventions for the Document Search project. Use when creating
  modules, controllers, services, DTOs, queue processors, or integrating S3,
  Elasticsearch, Bull, and LangChain.
---

# Backend Patterns

## Stack

NestJS 10 + TypeScript + TypeORM + Bull + Elasticsearch + AWS SDK v3 + LangChain.

Entry: `backend/src/main.ts` — global `ValidationPipe`, CORS from `FRONTEND_URL`.

## Module-Per-Feature

Each domain lives in `backend/src/<feature>/`:

```
<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts   # HTTP layer (if exposed)
├── <feature>.service.ts      # Business logic
└── dto/                      # Request/response DTOs (optional)
```

Register new modules in `app.module.ts`.

### Existing modules

| Module | Path prefix | Role |
|--------|-------------|------|
| `documents` | `api/documents` | CRUD, upload, reindex |
| `search` | `api/search` | ES queries, summarize |
| `upload` | — | File handling (may overlap documents) |
| `ai` | — | LangChain + OpenAI summaries |
| `elasticsearch` | — | Index CRUD, search |
| `queue` | — | Bull jobs + `DocumentProcessor` |
| `s3` | — | File storage |
| `database` | — | TypeORM config + entities |

## Controller Pattern

```typescript
@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async getAllDocuments() {
    return await this.documentsService.findAll()
  }
}
```

- Route prefix includes `api/` (no global prefix in `main.ts`)
- Use `ParseFilePipe` + validators for uploads (see `documents.controller.ts`)
- File uploads: `@UseInterceptors(FileInterceptor('file'))`

## Service Pattern

- `@Injectable()` with constructor DI
- Inject repositories: `@InjectRepository(DocumentEntity)`
- Cross-module deps via module `exports`/`imports`
- Private `toDTO()` methods to shape API responses (hide internal fields like `extractedText` from list views)
- Throw descriptive errors; controllers can wrap in NestJS `HttpException` when refining

## Async Document Processing

Upload flow in `DocumentsService.uploadDocument`:

1. Upload to S3 → create DB record (`status: processing`)
2. `queueService.addDocumentProcessingJob(id, s3Key)`

Processor (`queue/processors/document.processor.ts`):

```
fetch doc → parse text → AI summary → ES index → status: indexed
on error → status: srcerror
```

Queue name: `document-processing`, job: `process-document`.

Use `forwardRef(() => DocumentsModule)` when circular deps arise (`queue.module.ts`).

## Adding a New Feature

1. Create module folder under `backend/src/`
2. Define module with `imports`, `providers`, `exports`
3. Add controller if HTTP-facing
4. Register in `app.module.ts`
5. If DB entity needed → add to `database/entities/`, register in `DatabaseModule`

## Validation

Global pipe: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.

Use DTO classes with `class-validator` decorators for POST bodies.

## External Service Integration

| Service | Pattern |
|---------|---------|
| S3 | `S3Service.uploadFile(file, key)` — keys like `documents/${timestamp}-${name}` |
| Elasticsearch | `ElasticsearchService.indexDocument({ id, title, content, ... })` — index `documents` |
| AI | `AIService.generateSummary(text)` |
| Config | `ConfigService.get('KEY', 'default')` via global `ConfigModule` |

## File Naming

- kebab-case files: `documents.service.ts`, `document-parser.service.ts`
- PascalCase classes: `DocumentsService`, `DocumentProcessor`

## Error Handling

- Processor catches errors → sets `DocumentStatus.ERROR`, rethrows for Bull retry
- Delete operations: best-effort ES cleanup with try/catch (don't block DB delete)

## Testing

```bash
cd backend && npm test
cd backend && npm run test:integration   # requires PostgreSQL (see DB_* env vars)
cd backend && npm run test:e2e           # full API workflows; requires PostgreSQL
```

CI runs with Postgres + Redis service containers. Set `DB_*` and `REDIS_*` env vars.

## Do Not

- Store files on local disk in production (use S3)
- Enable TypeORM `synchronize: true` in production
- Skip queue for heavy work (parsing, AI, indexing)

## Related Files

| File | Reference |
|------|-----------|
| `backend/src/documents/documents.service.ts` | Upload + delete orchestration |
| `backend/src/queue/processors/document.processor.ts` | Background job pattern |
| `backend/src/app.module.ts` | Module registration |
| `memory-bank/systemPatterns.md` | Architecture overview |
