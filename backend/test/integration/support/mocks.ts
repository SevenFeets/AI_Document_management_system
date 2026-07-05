import { S3Service } from '../../../src/s3/s3.service';
import { QueueService } from '../../../src/queue/queue.service';
import { ElasticsearchService } from '../../../src/elasticsearch/elasticsearch.service';
import { AIService } from '../../../src/ai/ai.service';

export const mockS3Service = {
  uploadFile: jest.fn().mockResolvedValue('documents/test-key'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFileUrl: jest.fn().mockResolvedValue('https://example.com/file'),
  downloadFile: jest.fn().mockResolvedValue(Buffer.from('file content')),
  getBucketName: jest.fn().mockReturnValue('test-bucket'),
};

export const mockQueueService = {
  addDocumentProcessingJob: jest.fn().mockResolvedValue(undefined),
};

export const mockElasticsearchService = {
  search: jest.fn().mockResolvedValue([]),
  indexDocument: jest.fn().mockResolvedValue({ result: 'created' }),
  deleteDocument: jest.fn().mockResolvedValue({ result: 'deleted' }),
  createIndexIfNotExists: jest.fn().mockResolvedValue(undefined),
};

export const mockAIService = {
  summarizeDocument: jest.fn().mockResolvedValue('Integration test summary'),
  generateSummary: jest.fn().mockResolvedValue('Generated summary'),
};

export const externalServiceMocks = [
  { provide: S3Service, useValue: mockS3Service },
  { provide: QueueService, useValue: mockQueueService },
  { provide: ElasticsearchService, useValue: mockElasticsearchService },
  { provide: AIService, useValue: mockAIService },
];

export function resetExternalMocks(): void {
  jest.clearAllMocks();
  mockS3Service.uploadFile.mockResolvedValue('documents/test-key');
  mockS3Service.deleteFile.mockResolvedValue(undefined);
  mockQueueService.addDocumentProcessingJob.mockResolvedValue(undefined);
  mockElasticsearchService.search.mockResolvedValue([]);
  mockElasticsearchService.indexDocument.mockResolvedValue({
    result: 'created',
  });
  mockElasticsearchService.deleteDocument.mockResolvedValue({
    result: 'deleted',
  });
  mockAIService.summarizeDocument.mockResolvedValue('Integration test summary');
  mockAIService.generateSummary.mockResolvedValue('Generated summary');
}
