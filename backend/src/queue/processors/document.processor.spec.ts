import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Job } from 'bull'
import { DocumentProcessor } from './document.processor'
import { DocumentEntity, DocumentStatus } from '../../database/entities/document.entity'
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service'
import { S3Service } from '../../s3/s3.service'
import { AIService } from '../../ai/ai.service'
import { DocumentParserService } from '../../documents/services/document-parser.service'

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor
  let repository: {
    findOne: jest.Mock
    save: jest.Mock
    update: jest.Mock
  }
  let elasticsearchService: { indexDocument: jest.Mock }
  let documentParserService: { parseDocument: jest.Mock }
  let aiService: { generateSummary: jest.Mock }

  const documentId = 'doc-1'
  const s3Key = 'documents/123-report.pdf'
  const extractedText = 'Parsed document body'
  const summary = 'AI generated summary'

  const createMockEntity = (
    overrides: Partial<DocumentEntity> = {},
  ): DocumentEntity =>
    ({
      id: documentId,
      title: 'Report',
      filename: 'report.pdf',
      fileType: 'application/pdf',
      fileSize: 1000,
      s3Key,
      s3Bucket: 'document-search',
      status: DocumentStatus.PROCESSING,
      summary: null,
      metadata: null,
      extractedText: null,
      uploadDate: new Date('2026-01-15T10:00:00.000Z'),
      updatedAt: new Date('2026-01-15T10:00:00.000Z'),
      ...overrides,
    }) as DocumentEntity

  const createMockJob = (
    data: { documentId: string; s3Key: string } = { documentId, s3Key },
  ): Job<{ documentId: string; s3Key: string }> =>
    ({
      data,
      progress: jest.fn(),
    }) as unknown as Job<{ documentId: string; s3Key: string }>

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    }
    elasticsearchService = {
      indexDocument: jest.fn(),
    }
    documentParserService = {
      parseDocument: jest.fn(),
    }
    aiService = {
      generateSummary: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentProcessor,
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: repository,
        },
        {
          provide: ElasticsearchService,
          useValue: elasticsearchService,
        },
        {
          provide: S3Service,
          useValue: {},
        },
        {
          provide: AIService,
          useValue: aiService,
        },
        {
          provide: DocumentParserService,
          useValue: documentParserService,
        },
      ],
    }).compile()

    processor = module.get<DocumentProcessor>(DocumentProcessor)
  })

  describe('handleDocumentProcessing', () => {
    it('should process document through parse, summary, index, and mark INDEXED', async () => {
      const document = createMockEntity()
      const job = createMockJob()
      repository.findOne.mockResolvedValue(document)
      documentParserService.parseDocument.mockResolvedValue(extractedText)
      repository.save.mockImplementation((doc) => Promise.resolve(doc))
      aiService.generateSummary.mockResolvedValue(summary)
      elasticsearchService.indexDocument.mockResolvedValue(undefined)

      const result = await processor.handleDocumentProcessing(job)

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: documentId },
      })
      expect(documentParserService.parseDocument).toHaveBeenCalledWith(
        s3Key,
        'application/pdf',
      )
      expect(aiService.generateSummary).toHaveBeenCalledWith(extractedText)
      expect(elasticsearchService.indexDocument).toHaveBeenCalledWith({
        id: document.id,
        title: document.title,
        filename: document.filename,
        content: extractedText,
        summary,
        fileType: document.fileType,
        uploadDate: document.uploadDate,
      })
      expect(repository.save).toHaveBeenCalledTimes(3)
      expect(document.extractedText).toBe(extractedText)
      expect(document.summary).toBe(summary)
      expect(document.status).toBe(DocumentStatus.INDEXED)
      expect(job.progress).toHaveBeenCalledWith(10)
      expect(job.progress).toHaveBeenCalledWith(40)
      expect(job.progress).toHaveBeenCalledWith(60)
      expect(job.progress).toHaveBeenCalledWith(80)
      expect(job.progress).toHaveBeenCalledWith(100)
      expect(result).toEqual({ success: true, documentId })
    })

    it('should throw and set ERROR when document is not found', async () => {
      const job = createMockJob()
      repository.findOne.mockResolvedValue(null)
      repository.update.mockResolvedValue(undefined)

      await expect(processor.handleDocumentProcessing(job)).rejects.toThrow(
        `Document ${documentId} not found`,
      )

      expect(documentParserService.parseDocument).not.toHaveBeenCalled()
      expect(repository.update).toHaveBeenCalledWith(documentId, {
        status: DocumentStatus.ERROR,
      })
    })

    it('should throw and set ERROR when parsing fails', async () => {
      const job = createMockJob()
      repository.findOne.mockResolvedValue(createMockEntity())
      documentParserService.parseDocument.mockRejectedValue(
        new Error('Unsupported file type'),
      )
      repository.update.mockResolvedValue(undefined)

      await expect(processor.handleDocumentProcessing(job)).rejects.toThrow(
        'Unsupported file type',
      )

      expect(aiService.generateSummary).not.toHaveBeenCalled()
      expect(repository.update).toHaveBeenCalledWith(documentId, {
        status: DocumentStatus.ERROR,
      })
    })

    it('should throw and set ERROR when AI summary fails', async () => {
      const job = createMockJob()
      repository.findOne.mockResolvedValue(createMockEntity())
      documentParserService.parseDocument.mockResolvedValue(extractedText)
      repository.save.mockImplementation((doc) => Promise.resolve(doc))
      aiService.generateSummary.mockRejectedValue(new Error('AI unavailable'))
      repository.update.mockResolvedValue(undefined)

      await expect(processor.handleDocumentProcessing(job)).rejects.toThrow(
        'AI unavailable',
      )

      expect(elasticsearchService.indexDocument).not.toHaveBeenCalled()
      expect(repository.update).toHaveBeenCalledWith(documentId, {
        status: DocumentStatus.ERROR,
      })
    })

    it('should throw and set ERROR when Elasticsearch indexing fails', async () => {
      const job = createMockJob()
      const document = createMockEntity()
      repository.findOne.mockResolvedValue(document)
      documentParserService.parseDocument.mockResolvedValue(extractedText)
      repository.save.mockImplementation((doc) => Promise.resolve(doc))
      aiService.generateSummary.mockResolvedValue(summary)
      elasticsearchService.indexDocument.mockRejectedValue(
        new Error('ES cluster down'),
      )
      repository.update.mockResolvedValue(undefined)

      await expect(processor.handleDocumentProcessing(job)).rejects.toThrow(
        'ES cluster down',
      )

      expect(document.status).not.toBe(DocumentStatus.INDEXED)
      expect(repository.update).toHaveBeenCalledWith(documentId, {
        status: DocumentStatus.ERROR,
      })
    })
  })
})
