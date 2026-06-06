import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { IsNull, Not } from 'typeorm'
import { DocumentsService } from './documents.service'
import { DocumentEntity, DocumentStatus } from '../database/entities/document.entity'
import { S3Service } from '../s3/s3.service'
import { QueueService } from '../queue/queue.service'
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service'

describe('DocumentsService', () => {
  let service: DocumentsService
  let repository: {
    find: jest.Mock
    findOne: jest.Mock
    save: jest.Mock
    create: jest.Mock
    remove: jest.Mock
  }
  let s3Service: { uploadFile: jest.Mock; deleteFile: jest.Mock }
  let queueService: { addDocumentProcessingJob: jest.Mock }
  let elasticsearchService: {
    indexDocument: jest.Mock
    deleteDocument: jest.Mock
  }

  const createMockEntity = (
    overrides: Partial<DocumentEntity> = {},
  ): DocumentEntity =>
    ({
      id: 'doc-1',
      title: 'Report',
      filename: 'report.pdf',
      fileType: 'application/pdf',
      fileSize: 1000,
      s3Key: 'documents/123-report.pdf',
      s3Bucket: 'document-search',
      status: DocumentStatus.INDEXED,
      summary: 'A summary',
      metadata: { pages: 3 },
      extractedText: 'Document body text',
      uploadDate: new Date('2026-01-15T10:00:00.000Z'),
      updatedAt: new Date('2026-01-15T10:00:00.000Z'),
      ...overrides,
    }) as DocumentEntity

  const toExpectedDto = (entity: DocumentEntity) => ({
    id: entity.id,
    title: entity.title,
    filename: entity.filename,
    fileType: entity.fileType,
    fileSize: entity.fileSize,
    uploadDate: entity.uploadDate.toISOString(),
    status: entity.status,
    summary: entity.summary,
    metadata: entity.metadata,
  })

  const createMockMulterFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: 2048,
      ...overrides,
    }) as Express.Multer.File

  beforeEach(async () => {
    repository = {
      find: jest.fn(), 
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    }
    s3Service = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    }
    queueService = {
      addDocumentProcessingJob: jest.fn(),
    }
    elasticsearchService = {
      indexDocument: jest.fn(),
      deleteDocument: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: repository,
        },
        {
          provide: S3Service,
          useValue: s3Service,
        },
        {
          provide: QueueService,
          useValue: queueService,
        },
        {
          provide: ElasticsearchService,
          useValue: elasticsearchService,
        },
      ],
    }).compile()

    service = module.get<DocumentsService>(DocumentsService)
  })

  describe('findAll', () => {
    it('should return documents ordered by uploadDate descending', async () => {
      repository.find.mockResolvedValue([createMockEntity()])

      await service.findAll()

      expect(repository.find).toHaveBeenCalledTimes(1)
      expect(repository.find).toHaveBeenCalledWith({
        order: { uploadDate: 'DESC' },
      })
    })

    it('should map entities to DTO shape', async () => {
      const entity = createMockEntity()
      repository.find.mockResolvedValue([entity])

      const result = await service.findAll()

      expect(result).toEqual([toExpectedDto(entity)])
    })
  })

  describe('findOne', () => {
    it('should return a DTO (Data Transfer Object) when document exists', async () => {
      const entity = createMockEntity({ id: 'doc-42' })
      repository.findOne.mockResolvedValue(entity)
      
      const result = await service.findOne('doc-42')

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'doc-42' } })
      expect(result).toEqual(toExpectedDto(entity))
    })

    it('should throw when document is not found', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.findOne('missing-id')).rejects.toThrow(
        'Document with ID missing-id not found',
      )
    })
  })

  describe('uploadDocument', () => {
    it('should upload file to S3 with documents/ key prefix', async () => {
      const file = createMockMulterFile()
      const saved = createMockEntity({
        id: 'new-doc',
        status: DocumentStatus.PROCESSING,
      })
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      s3Service.uploadFile.mockResolvedValue(undefined)
      repository.create.mockImplementation((data) => data)
      repository.save.mockResolvedValue(saved)
      queueService.addDocumentProcessingJob.mockResolvedValue(undefined)

      await service.uploadDocument(file)

      expect(s3Service.uploadFile).toHaveBeenCalledWith(
        file,
        'documents/1700000000000-report.pdf',
      )

      jest.restoreAllMocks()
    })

    it('should save document with PROCESSING status', async () => {
      const file = createMockMulterFile()
      s3Service.uploadFile.mockResolvedValue(undefined)
      repository.create.mockImplementation((data) => data)
      repository.save.mockResolvedValue(
        createMockEntity({ id: 'new-doc', status: DocumentStatus.PROCESSING }),
      )
      queueService.addDocumentProcessingJob.mockResolvedValue(undefined)

      await service.uploadDocument(file)

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'report.pdf',
          filename: 'report.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          status: DocumentStatus.PROCESSING,
        }),
      )
    })

    it('should enqueue processing job with document id and s3 key', async () => {
      const file = createMockMulterFile()
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      const s3Key = 'documents/1700000000000-report.pdf'
      s3Service.uploadFile.mockResolvedValue(undefined)
      repository.create.mockImplementation((data) => data)
      repository.save.mockResolvedValue(
        createMockEntity({ id: 'new-doc', s3Key, status: DocumentStatus.PROCESSING }),
      )
      queueService.addDocumentProcessingJob.mockResolvedValue(undefined)

      await service.uploadDocument(file)

      expect(queueService.addDocumentProcessingJob).toHaveBeenCalledWith(
        'new-doc',
        s3Key,
      )

      jest.restoreAllMocks()
    })

    it('should return id and success message', async () => {
      const file = createMockMulterFile()
      s3Service.uploadFile.mockResolvedValue(undefined)
      repository.create.mockImplementation((data) => data)
      repository.save.mockResolvedValue(
        createMockEntity({ id: 'new-doc', status: DocumentStatus.PROCESSING }),
      )
      queueService.addDocumentProcessingJob.mockResolvedValue(undefined)

      const result = await service.uploadDocument(file)

      expect(result).toEqual({
        id: 'new-doc',
        message: 'Document uploaded successfully and queued for processing',
      })
    })
  })

  describe('delete', () => {
    it('should delete from S3, Elasticsearch, and database when document exists', async () => {
      const entity = createMockEntity({ id: 'doc-1', s3Key: 'documents/key.pdf' })
      repository.findOne.mockResolvedValue(entity)
      s3Service.deleteFile.mockResolvedValue(undefined)
      elasticsearchService.deleteDocument.mockResolvedValue(undefined)
      repository.remove.mockResolvedValue(entity)

      const result = await service.delete('doc-1')

      expect(s3Service.deleteFile).toHaveBeenCalledWith('documents/key.pdf')
      expect(elasticsearchService.deleteDocument).toHaveBeenCalledWith('doc-1')
      expect(repository.remove).toHaveBeenCalledWith(entity)
      expect(result).toEqual({ message: 'Document deleted successfully' })
    })

    it('should throw when document is not found', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.delete('missing-id')).rejects.toThrow(
        'Document with ID missing-id not found',
      )

      expect(s3Service.deleteFile).not.toHaveBeenCalled()
      expect(elasticsearchService.deleteDocument).not.toHaveBeenCalled()
      expect(repository.remove).not.toHaveBeenCalled()
    })

    it('should still remove from database when Elasticsearch delete fails', async () => {
      const entity = createMockEntity({ id: 'doc-1' })
      repository.findOne.mockResolvedValue(entity)
      s3Service.deleteFile.mockResolvedValue(undefined)
      elasticsearchService.deleteDocument.mockRejectedValue(
        new Error('ES unavailable'),
      )
      repository.remove.mockResolvedValue(entity)

      const result = await service.delete('doc-1')

      expect(repository.remove).toHaveBeenCalledWith(entity)
      expect(result).toEqual({ message: 'Document deleted successfully' })
    })
  })

  describe('reindexAllDocuments', () => {
    it('should only reindex INDEXED documents with extractedText', async () => {
      const entity = createMockEntity()
      repository.find.mockResolvedValue([entity])
      elasticsearchService.indexDocument.mockResolvedValue(undefined)

      await service.reindexAllDocuments()

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          status: DocumentStatus.INDEXED,
          extractedText: Not(IsNull()),
        },
      })
      expect(elasticsearchService.indexDocument).toHaveBeenCalledWith({
        id: entity.id,
        title: entity.title,
        filename: entity.filename,
        content: entity.extractedText,
        summary: entity.summary,
        fileType: entity.fileType,
        uploadDate: entity.uploadDate,
      })
    })

    it('should return total, success, and failed counts', async () => {
      const docs = [
        createMockEntity({ id: 'doc-1' }),
        createMockEntity({ id: 'doc-2' }),
      ]
      repository.find.mockResolvedValue(docs)
      elasticsearchService.indexDocument.mockResolvedValue(undefined)

      const result = await service.reindexAllDocuments()

      expect(result).toEqual({
        total: 2,
        success: 2,
        failed: 0,
        message: 'Reindexed 2 of 2 documents',
      })
    })

    it('should continue when individual index operations fail', async () => {
      const docs = [
        createMockEntity({ id: 'doc-1' }),
        createMockEntity({ id: 'doc-2' }),
      ]
      repository.find.mockResolvedValue(docs)
      elasticsearchService.indexDocument
        .mockRejectedValueOnce(new Error('index failed'))
        .mockResolvedValueOnce(undefined)

      const result = await service.reindexAllDocuments()

      expect(elasticsearchService.indexDocument).toHaveBeenCalledTimes(2)
      expect(result).toEqual({
        total: 2,
        success: 1,
        failed: 1,
        message: 'Reindexed 1 of 2 documents',
      })
    })
  })

  describe('reindexDocument', () => {
    it('should reindex a valid indexed document with extracted text', async () => {
      const entity = createMockEntity({ id: 'doc-1' })
      repository.findOne.mockResolvedValue(entity)
      elasticsearchService.indexDocument.mockResolvedValue(undefined)

      const result = await service.reindexDocument('doc-1')

      expect(elasticsearchService.indexDocument).toHaveBeenCalledWith({
        id: entity.id,
        title: entity.title,
        filename: entity.filename,
        content: entity.extractedText,
        summary: entity.summary,
        fileType: entity.fileType,
        uploadDate: entity.uploadDate,
      })
      expect(result).toEqual({
        success: true,
        message: 'Document report.pdf reindexed successfully',
      })
    })

    it('should throw when document is not found', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.reindexDocument('missing-id')).rejects.toThrow(
        'Document with ID missing-id not found',
      )

      expect(elasticsearchService.indexDocument).not.toHaveBeenCalled()
    })

    it('should throw when status is not INDEXED', async () => {
      repository.findOne.mockResolvedValue(
        createMockEntity({ status: DocumentStatus.PROCESSING }),
      )

      await expect(service.reindexDocument('doc-1')).rejects.toThrow(
        'Document is not in indexed status. Current status: processing',
      )
    })

    it('should throw when extractedText is missing', async () => {
      repository.findOne.mockResolvedValue(
        createMockEntity({ extractedText: null as unknown as string }),
      )

      await expect(service.reindexDocument('doc-1')).rejects.toThrow(
        'Document has no extracted text to index',
      )
    })

    it('should throw when Elasticsearch indexing fails', async () => {
      repository.findOne.mockResolvedValue(createMockEntity())
      elasticsearchService.indexDocument.mockRejectedValue(
        new Error('cluster down'),
      )

      await expect(service.reindexDocument('doc-1')).rejects.toThrow(
        'Failed to reindex document: cluster down',
      )
    })
  })
})
