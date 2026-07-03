import { INestApplication } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { DocumentEntity } from '../../src/database/entities/document.entity'
import { attachFixture, fixtures } from '../e2e/support/fixtures'
import {
  createIntegrationTestApp,
  IntegrationTestContext,
} from '../integration/support/test-app.factory'
import { resetExternalMocks } from '../integration/support/mocks'
import { PERF } from './support/thresholds'
import { measureMs, percentile } from './support/timing'

function fakeSearchHits(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `perf-doc-${index}`,
    title: `Machine Learning Report ${index}`,
    filename: `ml-report-${index}.txt`,
    snippet: 'machine learning adoption accelerated',
    score: 2.1,
    metadata: { fileType: 'text/plain', uploadDate: new Date().toISOString() },
  }))
}

describe('Concurrent users (performance)', () => {
  let ctx: IntegrationTestContext
  let app: INestApplication
  let documentRepository: Repository<DocumentEntity>
  let dbAvailable = true

  beforeAll(async () => {
    try {
      ctx = await createIntegrationTestApp()
      app = ctx.app
      documentRepository = ctx.moduleFixture.get(getRepositoryToken(DocumentEntity))
    } catch (error) {
      dbAvailable = false
      console.warn(
        `Concurrent performance tests skipped — database unavailable: ${
          error instanceof Error ? error.message : error
        }`,
      )
    }
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  beforeEach(async () => {
    if (!dbAvailable) return
    resetExternalMocks()
    await documentRepository.clear()
  })

  it('parallel searches stay within PERF.searchP95Ms at p95', async () => {
    if (!dbAvailable) return

    ctx.mocks.elasticsearch.search.mockResolvedValue(fakeSearchHits(20))

    const durations = await Promise.all(
      Array.from({ length: PERF.concurrentSearchUsers }, () =>
        measureMs(async () => {
          await request(app.getHttpServer())
            .get('/api/search')
            .query({ q: 'term' })
            .expect(200)
        }),
      ),
    )

    const p95 = percentile(durations, 95)
    console.log(`parallel search p95: ${p95}ms (threshold ${PERF.searchP95Ms}ms)`)
    expect(p95).toBeLessThan(PERF.searchP95Ms)
  })

  it('parallel uploads complete within PERF.concurrentUploadTotalMs', async () => {
    if (!dbAvailable) return

    const wallStart = Date.now()
    await Promise.all(
      Array.from({ length: PERF.concurrentUploadUsers }, (_, index) =>
        attachFixture(
          request(app.getHttpServer()).post('/api/documents/upload'),
          fixtures.txt(`Concurrent perf upload ${index + 1}`),
        ).expect(200),
      ),
    )
    const wallMs = Date.now() - wallStart

    console.log(
      `parallel upload wall: ${wallMs}ms (threshold ${PERF.concurrentUploadTotalMs}ms)`,
    )
    expect(wallMs).toBeLessThan(PERF.concurrentUploadTotalMs)
    expect(await documentRepository.count()).toBe(PERF.concurrentUploadUsers)
  })
})
