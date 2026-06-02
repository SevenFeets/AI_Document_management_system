import { Test, TestingModule } from '@nestjs/testing'
import { SearchService } from './search.service'
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service'
import { AIService } from '../ai/ai.service'
import { DocumentsService } from '../documents/documents.service'

const PLACEHOLDER_CONTENT = 'Document content would be fetched here'

describe('SearchService', () => {
  let service: SearchService
  let elasticsearchService: { search: jest.Mock }
  let aiService: { summarizeDocument: jest.Mock }
  let documentsService: { findOne: jest.Mock }

  beforeEach(async () => {
    elasticsearchService = { search: jest.fn() }
    aiService = { summarizeDocument: jest.fn() }
    documentsService = { findOne: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useValue: elasticsearchService,
        },
        {
          provide: AIService,
          useValue: aiService,
        },
        {
          provide: DocumentsService,
          useValue: documentsService,
        },
      ],
    }).compile()

    service = module.get<SearchService>(SearchService)
  })

  describe('search', () => {
    it('should delegate query to elasticsearchService.search', async () => {
      const query = 'machine learning'
      const fakeResults = [
        {
          id: 'doc-1',
          title: 'Report',
          filename: 'report.pdf',
          snippet: 'machine learning overview',
          score: 1.2,
          metadata: { fileType: 'application/pdf', uploadDate: '2026-01-01' },
        },
      ]
      elasticsearchService.search.mockResolvedValue(fakeResults)

      await service.search(query)

      expect(elasticsearchService.search).toHaveBeenCalledTimes(1)
      expect(elasticsearchService.search).toHaveBeenCalledWith(query)
    })

    it('should return elasticsearch search results', async () => {
      const fakeResults = [
        {
          id: 'doc-2',
          title: 'Notes',
          filename: 'notes.txt',
          snippet: 'sample hit',
          score: 0.9,
          metadata: { fileType: 'text/plain', uploadDate: '2026-02-01' },
        },
      ]
      elasticsearchService.search.mockResolvedValue(fakeResults)

      const result = await service.search('anything')

      expect(result).toEqual(fakeResults)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('doc-2')
    })
  })

  describe('summarizeDocument', () => {
    const fakeDocument = {
      id: 'doc-1',
      title: 'Report',
      filename: 'report.pdf',
      fileType: 'application/pdf',
      fileSize: 1000,
      uploadDate: '2026-01-01T00:00:00.000Z',
      status: 'indexed',
      summary: 'Existing summary',
      metadata: null,
    }

    it('should load document via documentsService.findOne', async () => {
      documentsService.findOne.mockResolvedValue(fakeDocument)
      aiService.summarizeDocument.mockResolvedValue('AI summary')

      await service.summarizeDocument('doc-1', 'key findings')

      expect(documentsService.findOne).toHaveBeenCalledTimes(1)
      expect(documentsService.findOne).toHaveBeenCalledWith('doc-1')
    })

    it('should call aiService.summarizeDocument with placeholder content and query', async () => {
      documentsService.findOne.mockResolvedValue(fakeDocument)
      aiService.summarizeDocument.mockResolvedValue('AI summary')

      await service.summarizeDocument('doc-1', 'key findings')

      expect(aiService.summarizeDocument).toHaveBeenCalledTimes(1)
      expect(aiService.summarizeDocument).toHaveBeenCalledWith(
        PLACEHOLDER_CONTENT,
        'key findings',
      )
    })

    it('should return object with summary property', async () => {
      documentsService.findOne.mockResolvedValue(fakeDocument)
      aiService.summarizeDocument.mockResolvedValue('Final summary')

      const result = await service.summarizeDocument('doc-1', 'overview')

      expect(result).toEqual({ summary: 'Final summary' })
    })

    it('should propagate errors when document is not found', async () => {
      documentsService.findOne.mockRejectedValue(
        new Error('Document with ID doc-1 not found'),
      )

      await expect(
        service.summarizeDocument('doc-1', 'overview'),
      ).rejects.toThrow('Document with ID doc-1 not found')

      expect(aiService.summarizeDocument).not.toHaveBeenCalled()
    })
  })
})
