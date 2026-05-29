# Active Context

> This file is updated at the start and end of each work session.
> It tells the next agent exactly where things stand and what to do next.

## Current Focus

- **Session date:** 2026-05-23
- **Area of interest:** AWS S3 integration (Phase 4.1–4.2 complete)
- **Status:** Real S3 in use — bucket `ai-pdss` (`il-central-1`), IAM user `yaroslav@Dev`

## Recent Changes

- Created `memory-bank/` folder with project context files for agent continuity
- `.gitignore` has uncommitted modifications

## What Works

- Full project scaffold: NestJS backend, React frontend, Docker Compose, Terraform, Kubernetes manifests, Grafana monitoring
- Backend modules: documents, upload, search, AI, Elasticsearch, queue, S3, database
- Frontend pages: Dashboard, DocumentUpload, DocumentSearch, DocumentDetail
- CI/CD workflow defined in `.github/workflows/ci-cd.yml`

## Known Gaps / Not Yet Verified

- JWT authentication and RBAC marked as "to be implemented" in `ARCHITECTURE.md`
- Frontend tests not yet added
- MVP success criteria in `ROADMAP.md` still unchecked
- Local dev environment not verified in this session

## Next Steps (Suggested)

1. Verify local stack: `docker-compose up -d` and confirm all services healthy
2. Test end-to-end upload → process → search → summarize flow
3. If deploying to Kubernetes: review and apply manifests in `kubernetes/` (backend, frontend, elasticsearch)
4. Address auth if moving toward production readiness

## Active Decisions

- **Storage:** Real AWS S3 (`ai-pdss`, `il-central-1`); local `uploads/` fallback when AWS env vars unset
- **AI:** Core features first, then AI summarization (LangChain + OpenAI)
- **Deployment:** Local testing before AWS/Kubernetes production deploy

## Files to Know

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Local dev stack |
| `kubernetes/*.yaml` | K8s deployments |
| `backend/src/` | NestJS API modules |
| `frontend/src/` | React UI |
| `ARCHITECTURE.md` | System design reference |
| `ROADMAP.md` | Phase plan and priorities |
