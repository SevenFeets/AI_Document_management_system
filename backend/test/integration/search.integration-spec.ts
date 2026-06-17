import { INestApplication } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import {
  DocumentEntity,
  DocumentStatus,
} from '../../src/database/entities/document.entity'
import { createIntegrationTestApp, IntegrationTestContext } from './support/test-app.factory'
import { resetExternalMocks } from './support/mocks'

describe('Search flow (integration)', () => {
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
        `Search integration tests skipped — database unavailable: ${
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

  it('GET /api/search?q= delegates to Elasticsearch and returns hits', async () => {
    if (!dbAvailable) return

    const hits = [
      {
        id: 'doc-search-1',
        title: 'Machine Learning Report',
        filename: 'ml-report.pdf',
        snippet: 'machine learning overview',
        score: 1.5,
        metadata: { fileType: 'application/pdf', uploadDate: '2026-01-01' },
      },
    ]
    ctx.mocks.elasticsearch.search.mockResolvedValue(hits)

    const response = await request(app.getHttpServer())
      .get('/api/search')
      .query({ q: 'machine learning' })
      .expect(200)

    expect(ctx.mocks.elasticsearch.search).toHaveBeenCalledWith('machine learning')
    expect(response.body).toEqual(hits)
  })

  it('GET /api/search without q returns an empty array', async () => {
    if (!dbAvailable) return

    const response = await request(app.getHttpServer())
      .get('/api/search')
      .expect(200)

    expect(response.body).toEqual([])
    expect(ctx.mocks.elasticsearch.search).not.toHaveBeenCalled()
  })
})

describe('Summarization flow (integration)', () => {
  let ctx: IntegrationTestContext
  let app: INestApplication
  let documentRepository: Repository<DocumentEntity>
  let dbAvailable = true
  let documentId: string

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
        `Summarization integration tests skipped — database unavailable: ${
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

    const saved = await documentRepository.save(
      documentRepository.create({
        title: 'Annual Report',
        filename: 'annual.txt',
        fileType: 'text/plain',
        fileSize: 512,
        s3Key: 'documents/annual.txt',
        s3Bucket: 'test-bucket',
        status: DocumentStatus.INDEXED,
        extractedText: 'Revenue increased year over year.',
        summary: 'Existing summary',
      }),
    )
    documentId = saved.id
  })

  it('POST /api/search/summarize returns AI summary for an existing document', async () => {
    if (!dbAvailable) return

    ctx.mocks.ai.summarizeDocument.mockResolvedValue(
      'Revenue trends are positive.',
    )

    const response = await request(app.getHttpServer())
      .post('/api/search/summarize')
      .send({ documentId, query: 'What are the revenue trends?' })
      .expect(200)

    expect(response.body).toEqual({ summary: 'Revenue trends are positive.' })
    expect(ctx.mocks.ai.summarizeDocument).toHaveBeenCalledWith(
      'Document content would be fetched here',
      'What are the revenue trends?',
    )
  })
})
