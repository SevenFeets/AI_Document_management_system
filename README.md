# AI-Powered Document Search & Summarization System

A comprehensive document management system that allows users to upload, store, and search through documents using ElasticSearch for fast text-based search and LangChain with RAG for AI-powered summarization.

## 🚀 Tech Stack

### Frontend
- **React 18** - UI library
- **Redux Toolkit** - State management
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type safety
- **PostgreSQL** - Primary database (via TypeORM)
- **Elasticsearch** - Full-text search engine
- **Redis/Bull** - Job queue for async processing
- **LangChain** - AI/ML framework
- **OpenAI** - LLM for summarization

### Infrastructure
- **AWS** - Cloud platform (EC2, Lambda, S3)
- **Terraform** - Infrastructure as Code
- **Docker & Docker Compose** - Containerization
- **RabbitMQ** - Message queue (optional)
- **Grafana** - Monitoring and observability
- **GitHub Actions** - CI/CD pipeline

## 📋 Features

- ✅ Document upload with drag & drop interface
- ✅ Automatic document parsing (PDF, DOC, DOCX, TXT)
- ✅ Fast full-text search using Elasticsearch
- ✅ AI-powered document summarization using LangChain & RAG
- ✅ Asynchronous document processing with job queues
- ✅ AWS S3 integration for document storage
- ✅ Real-time monitoring with Grafana
- ✅ Scalable architecture with Docker & Kubernetes support

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │ (React + Redux + Tailwind)
└──────┬──────┘
       │
┌──────▼──────┐
│   Backend   │ (NestJS API)
└──────┬──────┘
       │
   ┌───┴───┬──────────┬──────────┐
   │       │          │          │
┌──▼──┐ ┌──▼──┐  ┌───▼───┐  ┌───▼──┐
│PostgreSQL│ │Elastic│ │Redis│ │RabbitMQ│
│          │ │search │ │     │ │        │
└──────────┘ └───────┘ └─────┘ └────────┘
       │
┌──────▼──────┐
│   AWS S3    │ (Document Storage)
└─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)
- Elasticsearch (or use Docker)
- AWS Account (for S3, Lambda, EC2)
- OpenAI API Key (for AI summarization)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "AI powered Document search & summarization"
   ```

2. **Set up environment variables**

   Backend (`.env` in `backend/`):
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
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_S3_BUCKET=document-search
   OPENAI_API_KEY=your_openai_key
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   ```

   Frontend (`.env` in `frontend/`):
   ```env
   VITE_API_BASE_URL=http://localhost:4000/api
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL
   - Redis
   - Elasticsearch
   - RabbitMQ
   - Backend API
   - Frontend
   - Grafana

4. **Install dependencies and run locally (optional)**

   Backend:
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

   Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Grafana: http://localhost:3001 (admin/admin)
   - RabbitMQ Management: http://localhost:15672 (admin/admin)

## 📚 API Documentation

### Documents
- `GET /api/documents` - Get all documents
- `GET /api/documents/:id` - Get document by ID
- `POST /api/documents/upload` - Upload a document
- `DELETE /api/documents/:id` - Delete a document

### Search
- `GET /api/search?q=query` - Search documents
- `POST /api/search/summarize` - Generate AI summary
  ```json
  {
    "documentId": "uuid",
    "query": "What are the main points?"
  }
  ```

## 🏗️ Infrastructure Deployment

### Using Terraform

1. **Configure Terraform variables**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Initialize Terraform**
   ```bash
   terraform init
   ```

3. **Plan and apply**
   ```bash
   terraform plan
   terraform apply
   ```

This will create:
- VPC and networking
- EC2 instance
- S3 bucket
- Lambda function
- Security groups

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests (when added)
cd frontend
npm test
```

## 📊 Monitoring

Grafana is configured with dashboards for:
- Document upload rates
- Search query metrics
- Queue processing status
- System health

Access Grafana at http://localhost:3001

## 🔧 Development

### Project Structure

```
.
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   └── services/
│   └── package.json
├── backend/           # NestJS backend
│   ├── src/
│   │   ├── documents/
│   │   ├── search/
│   │   ├── upload/
│   │   ├── ai/
│   │   ├── elasticsearch/
│   │   └── queue/
│   └── package.json
├── terraform/         # Infrastructure as Code
├── monitoring/        # Grafana configs
└── docker-compose.yml # Local development
```

## 🚢 CI/CD

GitHub Actions workflow includes:
- Linting and testing
- Building Docker images
- Deploying to AWS with Terraform

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue in the repository.
