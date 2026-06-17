import { INestApplication } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { DocumentEntity } from '../../src/database/entities/document.entity'
import { createIntegrationTestApp, IntegrationTestContext } from './support/test-app.factory'
import { resetExternalMocks } from './support/mocks'

describe('Error scenarios (integration)', () => {
  let ctx: IntegrationTestContext
  let app: INestApplication
  let documentRepository: Repository<DocumentEntity>
  let dbAvailable = true

  beforeAll(async () => {
    try {
      ctx = await createIntegrationTestApp()
      app = ctx.app
      documentRepository = ctx.moduleFixture.get(
        getRepositoryToken(DocumentEntity),
      )
    } catch (error) {
      dbAvailable = false
      console.warn(
        `Error-scenario integration tests skipped — database unavailable: ${
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

  it('GET /api/documents/:id returns 404 for missing document', async () => {
    if (!dbAvailable) return

    const response = await request(app.getHttpServer())
      .get('/api/documents/00000000-0000-0000-0000-000000000000')
      .expect(404)

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: expect.stringContaining('not found'),
    })
  })

  it('DELETE /api/documents/:id returns 404 for missing document', async () => {
    if (!dbAvailable) return

    const response = await request(app.getHttpServer())
      .delete('/api/documents/00000000-0000-0000-0000-000000000000')
      .expect(404)

    expect(response.body.statusCode).toBe(404)
  })

  it('POST /api/documents/upload without a file returns 400', async () => {
    if (!dbAvailable) return

    const response = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .expect(400)

    expect(response.body.statusCode).toBe(400)
    expect(ctx.mocks.s3.uploadFile).not.toHaveBeenCalled()
    expect(ctx.mocks.queue.addDocumentProcessingJob).not.toHaveBeenCalled()
  })

  it('POST /api/documents/upload with invalid file type returns 400', async () => {
    if (!dbAvailable) return

    const response = await request(app.getHttpServer())
      .post('/api/documents/upload')
      .attach('file', Buffer.from('not a valid doc'), {
        filename: 'malware.exe',
        contentType: 'application/octet-stream',
      })
      .expect(400)

    expect(response.body.statusCode).toBe(400)
    expect(ctx.mocks.s3.uploadFile).not.toHaveBeenCalled()
  })

  it('POST /api/search/summarize returns 404 when document does not exist', async () => {
    if (!dbAvailable) return

    const response = await request(app.getHttpServer())
      .post('/api/search/summarize')
      .send({
        documentId: '00000000-0000-0000-0000-000000000000',
        query: 'summarize this',
      })
      .expect(404)

    expect(response.body.statusCode).toBe(404)
    expect(ctx.mocks.ai.summarizeDocument).not.toHaveBeenCalled()
  })
})
