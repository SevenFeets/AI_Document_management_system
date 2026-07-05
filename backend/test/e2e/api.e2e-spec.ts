import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import {
  DocumentEntity,
  DocumentStatus,
} from '../../src/database/entities/document.entity';
import {
  createIntegrationTestApp,
  IntegrationTestContext,
} from '../integration/support/test-app.factory';
import { resetExternalMocks } from '../integration/support/mocks';
import { attachFixture, fixtures } from './support/fixtures';

describe('End-to-end API workflows', () => {
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
        `E2E workflow tests skipped — database unavailable: ${
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

  it('runs upload → list → search → summarize → detail → delete', async () => {
    if (!dbAvailable) return;

    const upload = await attachFixture(
      request(app.getHttpServer()).post('/api/documents/upload'),
      fixtures.txt('Machine learning adoption accelerated in Q4.'),
    ).expect(200);

    const documentId = upload.body.id;

    await documentRepository.update(documentId, {
      status: DocumentStatus.INDEXED,
      extractedText: 'Machine learning adoption accelerated in Q4.',
      summary: 'ML adoption grew in Q4.',
    });

    const list = await request(app.getHttpServer())
      .get('/api/documents')
      .expect(200);
    expect(list.body.some((doc: { id: string }) => doc.id === documentId)).toBe(
      true,
    );

    ctx.mocks.elasticsearch.search.mockResolvedValue([
      {
        id: documentId,
        title: 'report.txt',
        filename: 'report.txt',
        snippet: 'Machine learning adoption accelerated',
        score: 2.1,
        metadata: {
          fileType: 'text/plain',
          uploadDate: new Date().toISOString(),
        },
      },
    ]);

    const search = await request(app.getHttpServer())
      .get('/api/search')
      .query({ q: 'machine learning' })
      .expect(200);

    expect(search.body).toHaveLength(1);
    expect(search.body[0].id).toBe(documentId);

    ctx.mocks.ai.summarizeDocument.mockResolvedValue(
      'Adoption of machine learning sped up in the fourth quarter.',
    );

    const summary = await request(app.getHttpServer())
      .post('/api/search/summarize')
      .send({ documentId, query: 'What happened in Q4?' })
      .expect(200);

    expect(summary.body.summary).toContain('machine learning');

    const detail = await request(app.getHttpServer())
      .get(`/api/documents/${documentId}`)
      .expect(200);

    expect(detail.body.status).toBe(DocumentStatus.INDEXED);

    await request(app.getHttpServer())
      .delete(`/api/documents/${documentId}`)
      .expect(200);

    expect(ctx.mocks.s3.deleteFile).toHaveBeenCalled();
    expect(ctx.mocks.elasticsearch.deleteDocument).toHaveBeenCalledWith(
      documentId,
    );

    await request(app.getHttpServer())
      .get(`/api/documents/${documentId}`)
      .expect(404);
  });
});

describe('End-to-end file type uploads', () => {
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
        `E2E file-type tests skipped — database unavailable: ${
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

  it.each([
    ['txt', fixtures.txt()],
    ['pdf', fixtures.pdf()],
    ['docx', fixtures.docx()],
    ['doc', fixtures.doc()],
  ])('accepts %s uploads', async (_label, fixture) => {
    if (!dbAvailable) return;

    const response = await attachFixture(
      request(app.getHttpServer()).post('/api/documents/upload'),
      fixture,
    ).expect(200);

    const saved = await documentRepository.findOne({
      where: { id: response.body.id },
    });

    expect(saved).toBeDefined();
    expect(saved!.filename).toBe(fixture.filename);
    expect(saved!.fileType).toBe(fixture.contentType);
    expect(ctx.mocks.s3.uploadFile).toHaveBeenCalledTimes(1);
  });
});

describe('End-to-end large file uploads', () => {
  let ctx: IntegrationTestContext;
  let app: INestApplication;
  let documentRepository: Repository<DocumentEntity>;
  let dbAvailable = true;

  const maxSizeBytes = 10 * 1024 * 1024;

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
        `E2E large-file tests skipped — database unavailable: ${
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

  it('accepts a file just under the 10MB limit', async () => {
    if (!dbAvailable) return;

    const fixture = fixtures.largeTxt(maxSizeBytes - 1024);

    const response = await attachFixture(
      request(app.getHttpServer()).post('/api/documents/upload'),
      fixture,
    ).expect(200);

    const saved = await documentRepository.findOne({
      where: { id: response.body.id },
    });

    expect(saved!.fileSize).toBe(fixture.buffer.length);
    expect(saved!.fileSize).toBeLessThan(maxSizeBytes);
  });

  it('rejects a file over the 10MB limit', async () => {
    if (!dbAvailable) return;

    const fixture = fixtures.largeTxt(maxSizeBytes + 1024);

    const response = await attachFixture(
      request(app.getHttpServer()).post('/api/documents/upload'),
      fixture,
    ).expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(ctx.mocks.s3.uploadFile).not.toHaveBeenCalled();
    expect(await documentRepository.count()).toBe(0);
  });
});

describe('End-to-end concurrent uploads', () => {
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
        `E2E concurrent-upload tests skipped — database unavailable: ${
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

  it('handles five parallel uploads without cross-talk', async () => {
    if (!dbAvailable) return;

    const uploads = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        attachFixture(
          request(app.getHttpServer()).post('/api/documents/upload'),
          fixtures.txt(`Concurrent upload payload ${index + 1}`),
        ).expect(200),
      ),
    );

    const ids = uploads.map((response) => response.body.id);
    expect(new Set(ids).size).toBe(5);

    expect(ctx.mocks.s3.uploadFile).toHaveBeenCalledTimes(5);
    expect(ctx.mocks.queue.addDocumentProcessingJob).toHaveBeenCalledTimes(5);

    const count = await documentRepository.count();
    expect(count).toBe(5);

    const list = await request(app.getHttpServer())
      .get('/api/documents')
      .expect(200);

    expect(list.body).toHaveLength(5);
  });
});
