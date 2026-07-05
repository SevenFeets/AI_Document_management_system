# Integration Tests (5.2) / E2E (5.3)

**Goal:** IMPLEMENTATION_PLAN §5.2–5.3 backend test coverage.

**Status:** done

**Last updated:** 2026-06-17

## Decisions

- E2E = API-level workflows via supertest (not Playwright); reuses integration test harness.
- `npm` scripts use `node node_modules/jest/bin/jest.js` for Windows paths with `&`.

## Done

- §5.2 integration tests (upload, search, summarize, errors)
- §5.3 E2E: full workflow, file types, large files, concurrent uploads
- `test/e2e/api.e2e-spec.ts`, `test/jest-e2e.json`, CI `test:e2e` job

## Open / next

- Phase 5.4 performance testing
- Optional: Playwright UI E2E later

## Files touched

- `backend/test/e2e/`
- `backend/test/jest-e2e.json`
- `backend/package.json`, CI, IMPLEMENTATION_PLAN.md, README
