# Document Search Backend

NestJS-based backend for the AI-Powered Document Search & Summarization System.

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type safety
- **PostgreSQL** - Primary database (via TypeORM)
- **Elasticsearch** - Full-text search
- **Redis/Bull** - Job queue for async processing
- **AWS S3** - Document storage
- **LangChain** - AI/ML integration
- **OpenAI** - LLM for summarization

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- Elasticsearch
- AWS Account (for S3)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=document_search

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=document-search

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# Application
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get document by ID
- `POST /api/documents/upload` - Upload a document
- `DELETE /api/documents/:id` - Delete a document

### Search
- `GET /api/search?q=query` - Search documents
- `POST /api/search/summarize` - Generate AI summary

## Architecture

- **Documents Module**: Handles document CRUD operations
- **Search Module**: Elasticsearch integration and search functionality
- **Upload Module**: File upload handling
- **Queue Module**: Background job processing with Bull
- **AI Module**: LangChain integration for summarization
- **S3 Module**: AWS S3 integration for file storage
- **Elasticsearch Module**: Search indexing and querying
