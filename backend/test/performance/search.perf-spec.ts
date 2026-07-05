import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../../src/database/entities/document.entity';
import {
  createIntegrationTestApp,
  IntegrationTestContext,
} from '../integration/support/test-app.factory';
import { resetExternalMocks } from '../integration/support/mocks';
import { PERF } from './support/thresholds';
import { measureMs } from './support/timing';

function fakeSearchHits(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `perf-doc-${index}`,
    title: `Machine Learning Report ${index}`,
    filename: `ml-report-${index}.txt`,
    snippet: 'machine learning adoption accelerated',
    score: 2.1,
    metadata: { fileType: 'text/plain', uploadDate: new Date().toISOString() },
  }));
}

describe('Search performance', () => {
  let ctx: IntegrationTestContext;
  let app: INestApplication;
  let documentRepository: Repository<DocumentEntity>;
  let dbAvailable = true;

  beforeAll(async () => {
    try {
      ctx = await createIntegrationTestApp();
      app = ctx.app;
      documentRepository = ctx.moduleFixture.get(
        getRepositoryToken(DocumentEntity),
      );
    } catch (error) {
      dbAvailable = false;
      console.warn(
        `Search performance tests skipped — database unavailable: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    resetExternalMocks();
    await documentRepository.clear();
  });

  it('GET /api/search completes within PERF.searchP95Ms', async () => {
    if (!dbAvailable) return;

    ctx.mocks.elasticsearch.search.mockResolvedValue(fakeSearchHits(20));

    const durationMs = await measureMs(async () => {
      await request(app.getHttpServer())
        .get('/api/search')
        .query({ q: 'machine learning' })
        .expect(200);
    });

    console.log(
      `search latency: ${durationMs}ms (threshold ${PERF.searchP95Ms}ms)`,
    );
    expect(durationMs).toBeLessThan(PERF.searchP95Ms);
  });
});
