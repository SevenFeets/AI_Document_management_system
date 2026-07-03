/**
 * Timing helpers for performance specs.
 */

/** Run async work and return elapsed milliseconds. */
export async function measureMs(fn: () => Promise<void>): Promise<number> {
  const start = Date.now()
  await fn()
  return Date.now() - start
}

/**
 * Return the p-th percentile from a set of durations.
 * @param p Percentile 0–100 (e.g. 95 for p95)
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    throw new Error('percentile requires at least one value')
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[index]
}
