Documents.module.ts:

1. 
    Imports: TypeORM repository for DocumentEntity
    Controllers: HTTP endpoints for document operations
    Providers: Business logic services
    Exports: Makes DocumentsService available to other modules

2.    Upload flow:
    1. User uploads file → DocumentsController
    2. DocumentsService.uploadDocument():
        - Uploads file to S3
        - Creates database record
        - Queues background processing job
    3. Background job processes:
        - Extracts text (DocumentParserService)
        - Generates AI summary
        - Indexes in Elasticsearch


    Delete flow:

    1. User deletes document → DocumentsController
    2. DocumentsService.delete():
        - Deletes from S3
        - Deletes from Elasticsearch
        - Deletes from database


3. Document parsing (via DocumentParserService)
Extracts text from PDF, Word, and text files
Currently a placeholder (commented out)
Used by background processing jobs


DocumentsModule
├── DocumentsController (HTTP layer)
│   ├── GET /api/documents
│   ├── GET /api/documents/:id
│   ├── POST /api/documents/upload
│   └── DELETE /api/documents/:id
│
├── DocumentsService (Business logic)
│   ├── findAll() - List documents
│   ├── findOne() - Get document details
│   ├── uploadDocument() - Upload & queue processing
│   └── delete() - Delete from all systems
│
└── DocumentParserService (Text extraction)
    └── parseDocument() - Extract text from files

** Integration with other modules **

The module integrates with:
    Database (TypeOrmModule) — stores document metadata
    S3 (S3Service) — stores actual files
    Queue (QueueService) — processes documents asynchronously
    Elasticsearch (ElasticsearchService) — enables search
    AI (AIService) — generates summaries (via queue processor)

Data flow example
Uploading a document:
1. Frontend → POST /api/documents/upload
   ↓
2. DocumentsController.uploadDocument()
   ↓
3. DocumentsService.uploadDocument()
   ├─→ S3Service.uploadFile() (stores file)
   ├─→ Database.save() (creates record)
   └─→ QueueService.addJob() (queues processing)
   ↓
4. Background Processor (separate module)
   ├─→ DocumentParserService.parseDocument()
   ├─→ AIService.generateSummary()
   └─→ ElasticsearchService.indexDocument()


Summary
    The DocumentsModule is the document management feature module. It:
    Exposes REST endpoints for document operations
    Manages the document lifecycle (upload, store, retrieve, delete)
    Coordinates with S3, database, queue, and Elasticsearch
    Provides document parsing capabilities