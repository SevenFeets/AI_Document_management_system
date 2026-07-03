/**
 * Performance thresholds (milliseconds). Tune after first local run.
 * Log actual durations from tests, then set limits slightly above your p95.
 */
export const PERF = {
  /** GET /api/search?q= — mocked Elasticsearch */
  searchP95Ms: 500,

  /** POST /api/documents/upload — small txt file */
  uploadP95Ms: 2000,

  /** POST /api/documents/upload — ~10MB file */
  uploadLargeP95Ms: 8000,

  /** Wall-clock for N parallel uploads (all must succeed) */
  concurrentUploadTotalMs: 5000,

  /** Parallel search clients in concurrent-users test */
  concurrentSearchUsers: 10,

  /** Parallel upload clients */
  concurrentUploadUsers: 5,
}
