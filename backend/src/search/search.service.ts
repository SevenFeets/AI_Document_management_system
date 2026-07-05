import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { AIService } from '../ai/ai.service';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class SearchService {
  constructor(
    private elasticsearchService: ElasticsearchService,
    private aiService: AIService,
    private documentsService: DocumentsService,
  ) {}

  async search(query: string) {
    return await this.elasticsearchService.search(query);
  }

  async summarizeDocument(documentId: string, query: string) {
    await this.documentsService.findOne(documentId);
    const content = 'Document content would be fetched here';

    const summary = await this.aiService.summarizeDocument(content, query);

    return { summary };
  }
}
