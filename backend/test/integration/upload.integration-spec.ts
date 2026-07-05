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
} from './support/test-app.factory';
import { resetExternalMocks } from './support/mocks';

describe('Upload flow (integration)', () => {
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
        `Upload integration tests skipped — database unavailable: ${
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

  it('POST /api/documents/upload stores document and queues processing', async () => {
    if (!dbAvailable) return;

    const response = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .attach('file', Buffer.from('Quarterly revenue grew 12%.'), 'report.txt')
      .expect(200);

    expect(response.body).toMatchObject({
      message: 'Document uploaded successfully and queued for processing',
    });
    expect(response.body.id).toBeDefined();

    expect(ctx.mocks.s3.uploadFile).toHaveBeenCalledTimes(1);
    expect(ctx.mocks.s3.uploadFile.mock.calls[0][1]).toMatch(
      /^documents\/\d+-report\.txt$/,
    );

    expect(ctx.mocks.queue.addDocumentProcessingJob).toHaveBeenCalledTimes(1);
    expect(ctx.mocks.queue.addDocumentProcessingJob).toHaveBeenCalledWith(
      response.body.id,
      expect.stringMatching(/^documents\/\d+-report\.txt$/),
    );

    const saved = await documentRepository.findOne({
      where: { id: response.body.id },
    });
    expect(saved).toMatchObject({
      title: 'report.txt',
      filename: 'report.txt',
      status: DocumentStatus.PROCESSING,
      s3Bucket: 'test-bucket',
    });
  });

  it('GET /api/documents lists uploaded documents', async () => {
    if (!dbAvailable) return;

    const upload = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .attach('file', Buffer.from('Hello integration tests.'), 'notes.txt')
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/api/documents')
      .expect(200);

    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({
      id: upload.body.id,
      filename: 'notes.txt',
      status: DocumentStatus.PROCESSING,
    });
  });

  it('GET /api/documents/:id returns a single document', async () => {
    if (!dbAvailable) return;

    const upload = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .attach('file', Buffer.from('Detail view test.'), 'detail.txt')
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/documents/${upload.body.id}`)
      .expect(200);

    expect(detail.body).toMatchObject({
      id: upload.body.id,
      title: 'detail.txt',
      status: DocumentStatus.PROCESSING,
    });
  });
});
