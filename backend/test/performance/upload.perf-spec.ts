import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { DocumentEntity } from '../../src/database/entities/document.entity';
import { attachFixture, fixtures } from '../e2e/support/fixtures';
import {
  createIntegrationTestApp,
  IntegrationTestContext,
} from '../integration/support/test-app.factory';
import { resetExternalMocks } from '../integration/support/mocks';
import { PERF } from './support/thresholds';
import { measureMs } from './support/timing';

describe('Upload performance', () => {
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
        `Upload performance tests skipped — database unavailable: ${
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

  it('small txt upload completes within PERF.uploadP95Ms', async () => {
    if (!dbAvailable) return;

    const durationMs = await measureMs(async () => {
      await attachFixture(
        request(app.getHttpServer()).post('/api/documents/upload'),
        fixtures.txt('Performance test small upload payload.'),
      ).expect(200);
    });

    console.log(
      `small upload latency: ${durationMs}ms (threshold ${PERF.uploadP95Ms}ms)`,
    );
    expect(durationMs).toBeLessThan(PERF.uploadP95Ms);
    expect(ctx.mocks.s3.uploadFile).toHaveBeenCalledTimes(1);
  });

  it('large upload completes within PERF.uploadLargeP95Ms', async () => {
    if (!dbAvailable) return;

    const maxSizeBytes = 10 * 1024 * 1024;
    const fixture = fixtures.largeTxt(maxSizeBytes - 1024);

    const durationMs = await measureMs(async () => {
      await attachFixture(
        request(app.getHttpServer()).post('/api/documents/upload'),
        fixture,
      ).expect(200);
    });

    console.log(
      `large upload latency: ${durationMs}ms (threshold ${PERF.uploadLargeP95Ms}ms)`,
    );
    expect(durationMs).toBeLessThan(PERF.uploadLargeP95Ms);
  });
});
