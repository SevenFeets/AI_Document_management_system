# Deployment Guide

## Prerequisites

- AWS Account with appropriate permissions
- Terraform installed (>= 1.0)
- Docker installed
- kubectl installed (for Kubernetes deployment)

## Local Development Deployment

### Using Docker Compose

```bash
docker-compose up -d
```

This starts all services locally:
- PostgreSQL
- Redis
- Elasticsearch
- RabbitMQ
- Backend API
- Frontend
- Grafana

## AWS Deployment

### Step 1: Configure AWS Credentials

```bash
aws configure
```

### Step 2: Set Up Terraform Backend

Create an S3 bucket for Terraform state:

```bash
aws s3 mb s3://document-search-terraform-state
```

### Step 3: Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### Step 4: Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### Step 5: Deploy Application

After infrastructure is created:

1. **Build Docker images**
   ```bash
   docker build -t document-search-backend:latest ./backend
   docker build -t document-search-frontend:latest ./frontend
   ```

2. **Push to ECR** (if using ECR)
   ```bash
   aws ecr create-repository --repository-name document-search-backend
   aws ecr create-repository --repository-name document-search-frontend
   # Tag and push images
   ```

3. **Deploy to EC2**
   - SSH into EC2 instance
   - Install Docker
   - Pull and run containers

## Kubernetes Deployment

### Step 1: Create Secrets

```bash
kubectl create secret generic db-secret \
  --from-literal=host=your-db-host \
  --from-literal=password=your-db-password
```

### Step 2: Deploy Services

```bash
kubectl apply -f kubernetes/elasticsearch-deployment.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml
```

### Step 3: Verify Deployment

```bash
kubectl get pods
kubectl get services
```

## Environment Variables

### Backend (.env)

```env
NODE_ENV=production
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_NAME=document_search
REDIS_HOST=your-redis-host
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://your-elasticsearch:9200
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
OPENAI_API_KEY=your-openai-key
PORT=4000
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env)

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## Monitoring Setup

1. Access Grafana: http://your-grafana-url:3001
2. Login with admin/admin
3. Configure data sources (PostgreSQL, Redis)
4. Import dashboards from `monitoring/grafana/dashboards/`

## CI/CD Deployment

The GitHub Actions workflow automatically:
1. Runs tests
2. Builds Docker images
3. Deploys to AWS (on main branch)

Ensure GitHub secrets are configured:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Rollback Procedure

### Terraform Rollback
```bash
terraform destroy
# Or revert to previous state
terraform apply -target=resource_name
```

### Kubernetes Rollback
```bash
kubectl rollout undo deployment/document-search-backend
kubectl rollout undo deployment/document-search-frontend
```

## Health Checks

- Backend: `GET http://your-api/api/health` (to be implemented)
- Frontend: Check if serving static files
- Elasticsearch: `GET http://your-elasticsearch:9200/_cluster/health`
- PostgreSQL: `pg_isready -h your-db-host`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check security groups
   - Verify credentials
   - Ensure database is accessible

2. **Elasticsearch Not Responding**
   - Check cluster health
   - Verify memory settings
   - Check logs

3. **S3 Upload Fails**
   - Verify AWS credentials
   - Check bucket permissions
   - Ensure bucket exists

4. **Queue Jobs Not Processing**
   - Check Redis connection
   - Verify worker is running
   - Check job queue status
