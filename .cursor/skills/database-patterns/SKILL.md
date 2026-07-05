---
name: database-patterns
description: >-
  Database and search indexing patterns for the Document Search project. Use when
  working with TypeORM entities, PostgreSQL, migrations, Elasticsearch indexes,
  or keeping DB and search indices in sync.
---

# Database Patterns

## Two Data Stores

| Store | Purpose | Access |
|-------|---------|--------|
| **PostgreSQL** | Document metadata, status, extracted text, summaries | TypeORM |
| **Elasticsearch** | Full-text search index | `@nestjs/elasticsearch` |

PostgreSQL is source of truth. Elasticsearch is a derived search index — keep them synchronized on create/update/delete.

## PostgreSQL (TypeORM)

### Configuration

`backend/src/database/database.module.ts`:

- `TypeOrmModule.forRootAsync` with `ConfigService`
- `synchronize: true` only when `NODE_ENV !== 'production'`
- `logging: true` in development
- Entities registered in `entities: [DocumentEntity]`

### Entity Pattern

File: `backend/src/database/entities/document.entity.ts`

```typescript
@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.PROCESSING })
  status: DocumentStatus

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  uploadDate: Date
}
```

Conventions:
- UUID primary keys
- Enum columns for status (`processing` | `indexed` | `error`)
- `jsonb` for flexible metadata
- `@CreateDateColumn` / `@UpdateDateColumn` for timestamps

### Repository Usage

Inject via `@InjectRepository(DocumentEntity)`:

```typescript
// Find with ordering
await this.documentRepository.find({ order: { uploadDate: 'DESC' } })

// Create + save
const doc = this.documentRepository.create({ ... })
await this.documentRepository.save(doc)

// Partial update
await this.documentRepository.update(id, { status: DocumentStatus.ERROR })

// Delete
await this.documentRepository.remove(document)
```

### Adding a New Entity

1. Create `database/entities/<name>.entity.ts`
2. Add to `entities` array in `database.module.ts`
3. Add `TypeOrmModule.forFeature([NewEntity])` in feature module
4. **Production:** create a migration; disable `synchronize`

### Migrations (production)

TypeORM 0.3.x uses DataSource API. Generate and run migrations instead of `synchronize: true` in production.

## Document Lifecycle & Status

```
upload="processing"  →  (queue job)  →  status="indexed"
                                    ↘  status="error"
```

Status transitions happen in `DocumentProcessor`:
- Set `extractedText` and `summary` incrementally during processing
- Set `INDEXED` only after successful Elasticsearch indexing

## Elasticsearch

### Index

Name: `documents` (constant in `ElasticsearchService`).

Created on startup via `createIndexIfNotExists()` with custom analyzers (edge ngram autocomplete on `title`, `filename`).

### Index document shape

```typescript
await elasticsearchService.indexDocument({
  id: document.id,
  title: document.title,
  filename: document.filename,
  content: extractedText,    // full text for search
  summary: document.summary,
  fileType: document.fileType,
  uploadDate: document.uploadDate,
})
```

### Sync rules

| Operation | PostgreSQL | Elasticsearch |
|-----------|-------------|---------------|
| Upload | Create record | Index after processing |
| Delete | Remove record | `deleteDocument(id)` (best-effort) |
| Reindex | Read `extractedText` | Re-call `indexDocument` |

Reindex endpoints: `POST /api/documents/reindex`, `POST /api/documents/:id/reindex`.

Only reindex docs with `status: indexed` and non-null `extractedText`.

## Query Patterns

```typescript
// Indexed docs with text (for reindex)
where: { status: DocumentStatus.INDEXED, extractedText: Not(IsNull()) }

// Single doc by id
where: { id }
```

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=document_search
ELASTICSEARCH_NODE=http://localhost:9200
```

CI test DB: `document_search_test`.

## Do Not

- Query Elasticsearch for authoritative metadata (use PostgreSQL)
- Mark `INDEXED` before ES indexing succeeds
- Use `synchronize: true` in production
- Store binary files in PostgreSQL (use S3; store `s3Key` + `s3Bucket`)

## Related Files

| File | Reference |
|------|-----------|
| `backend/src/database/database.module.ts` | TypeORM config |
| `backend/src/database/entities/document.entity.ts` | Entity schema |
| `backend/src/elasticsearch/elasticsearch.service.ts` | Index mappings |
| `backend/src/queue/processors/document.processor.ts` | Status transitions |
| `backend/src/documents/documents.service.ts` | Delete + reindex sync |
