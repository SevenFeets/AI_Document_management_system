---
name: git-deploy
description: >-
  Git workflow, CI/CD, and deployment for the Document Search project. Use when
  pushing code, creating PRs, deploying to AWS via Terraform, Kubernetes, Docker,
  or configuring GitHub Actions secrets.
---

# Git & Deploy

## Git Workflow

### Branch strategy

- `main` — production; triggers AWS deploy via CI
- `develop` — integration branch
- Feature branches → PR into `develop` or `main`

### Commit conventions

Use concise, purpose-focused messages:

```
feat(documents): add reindex endpoint
fix(search): handle empty Elasticsearch results
chore(ci): update Node version in workflow
```

### Before pushing

```bash
cd backend && npm run lint && npm test
cd frontend && npm run lint
```

Only commit when explicitly requested. Never force-push to `main`.

## CI/CD Pipeline

File: `.github/workflows/ci-cd.yml`

### Jobs

| Job | Trigger | Actions |
|-----|---------|---------|
| `lint-and-test` | push/PR to main, develop | Backend lint + test (Postgres + Redis services), frontend lint |
| `build` | after lint-and-test | `npm run build` both apps, Docker image build |
| `deploy` | push to `main` only | Terraform init/plan/apply to AWS |

### Required GitHub secrets

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Local CI simulation

```bash
# Backend tests (needs Postgres + Redis or docker-compose)
cd backend && npm ci && npm run lint && npm test

# Build
cd backend && npm run build
cd frontend && npm run build

# Docker
docker build -t document-search-backend:latest ./backend
docker build -t document-search-frontend:latest ./frontend
```

## Deployment Paths

### 1. Local (Docker Compose)

```bash
docker-compose up -d
```

Services: PostgreSQL, Redis, Elasticsearch, RabbitMQ, backend, frontend, Grafana.

URLs: frontend `:3000`, backend `:4000`, Grafana `:3001`.

### 2. AWS (Terraform)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # edit values
terraform init
terraform plan
terraform apply
```

Creates: VPC, EC2, S3, Lambda, security groups.

**State bucket:** create `document-search-terraform-state` S3 bucket before first run.

After infra: build images, push to ECR (optional), deploy on EC2.

### 3. Kubernetes

Order matters — deploy dependencies first:

```bash
kubectl create secret generic db-secret \
  --from-literal=host=your-db-host \
  --from-literal=password=your-db-password

kubectl apply -f kubernetes/elasticsearch-deployment.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/frontend-deployment.yaml

kubectl get pods
kubectl get services
```

Images: `document-search-backend:latest`, `document-search-frontend:latest` (build locally or push to registry).

Backend reads secrets via `secretKeyRef` (`db-secret`). Service names: `redis-service`, `elasticsearch-service`.

### Rollback

```bash
# Kubernetes
kubectl rollout undo deployment/document-search-backend
kubectl rollout undo deployment/document-search-frontend

# Terraform
terraform destroy   # or targeted apply
```

## Production Environment Variables

**Backend:** `NODE_ENV=production`, DB/Redis/ES credentials, AWS keys, `OPENAI_API_KEY`, `FRONTEND_URL`.

**Frontend:** `VITE_API_BASE_URL=https://your-api-domain.com/api` (baked at build time).

Use `kubectl create secret` or AWS Secrets Manager — never commit `.env` files.

## Deploy Checklist

```
- [ ] Tests pass locally
- [ ] Env vars / secrets configured
- [ ] Docker images built and tagged
- [ ] Database migrations applied (if any)
- [ ] Elasticsearch index exists
- [ ] Health checks pass after deploy
- [ ] Grafana dashboards imported (monitoring/grafana/)
```

## Troubleshooting

| Issue | Check |
|-------|-------|
| DB connection failed | Security groups, credentials, `DB_HOST` |
| ES not responding | Cluster health, memory limits |
| S3 upload fails | IAM permissions, bucket name |
| Queue stuck | Redis connection, worker logs |
| Frontend 404 on refresh | Nginx `try_files` in `frontend/nginx.conf` |

## Related Files

| File | Purpose |
|------|---------|
| `DEPLOYMENT.md` | Full deployment guide |
| `.github/workflows/ci-cd.yml` | CI/CD definition |
| `terraform/` | AWS IaC |
| `kubernetes/*.yaml` | K8s manifests |
| `docker-compose.yml` | Local stack |
