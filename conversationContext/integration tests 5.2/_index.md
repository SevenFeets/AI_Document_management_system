# Integration Tests (5.2)

**Goal:** Implement IMPLEMENTATION_PLAN §5.2 — integration tests for upload, search, summarization, and error flows.

**Status:** done

**Last updated:** 2026-06-08

## Decisions

- HTTP integration tests via **supertest** against a slim `IntegrationTestModule` (controllers + services + real Postgres, mocked S3/ES/Queue/AI).
- Tests skip gracefully when Postgres is unavailable; CI runs against the `document_search_test` database.
- `npm run test:integration` added; CI job runs after unit tests.

## Done

- Upload flow: POST upload → S3 + queue + DB; GET list/detail
- Search flow: GET `/api/search?q=` delegates to mocked Elasticsearch
- Summarization flow: POST `/api/search/summarize` with seeded document
- Error scenarios: 404, 400 (missing/invalid upload), summarize on missing doc
- `test/jest-integration.json`, CI step, IMPLEMENTATION_PLAN §5.2 marked complete

## Open / next

- Run integration tests locally with `docker-compose up -d postgres` and `DB_PORT=5433` if using compose port mapping
- Phase 5.3 E2E testing (optional)

## Files touched

- `backend/test/integration/` — specs + support (mocks, module, factory)
- `backend/test/jest-integration.json`
- `backend/package.json` — `test:integration` script
- `.github/workflows/ci-cd.yml` — integration test job
- `IMPLEMENTATION_PLAN.md`, `backend/README.md`, `backend-patterns` skill
