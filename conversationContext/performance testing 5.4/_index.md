# Performance Testing (5.4)

**Goal:** Learn how to implement IMPLEMENTATION_PLAN §5.4 — user implementing from skeletons.

**Status:** in progress

**Last updated:** 2026-06-20

## Decisions

- Perf specs reuse integration test app + mocked ES/S3 (same as e2e).
- Thresholds in `thresholds.ts` — tune after first `npm run test:performance` run.

## Done

- Scaffold: `test/performance/`, `jest-performance.json`, `npm run test:performance`
- `timing.ts`: `measureMs`, `percentile`
- All three perf specs implemented (search, upload, concurrent users)
- ES search: `track_total_hits: false`, `_source` field filter

## Open / next

- Run `npm run test:performance` with Postgres up; tune `thresholds.ts` from console logs

## Files touched

- `backend/test/performance/**`
- `backend/test/jest-performance.json`
- `backend/package.json`, `backend/README.md`
