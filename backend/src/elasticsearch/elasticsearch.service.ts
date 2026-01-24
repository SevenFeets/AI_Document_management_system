import { Injectable } from '@nestjs/common'
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch'

@Injectable()
export class ElasticsearchService {
  private readonly indexName = 'documents'

  constructor(
    private readonly elasticsearchService: NestElasticsearchService,
  ) {}

  async createIndexIfNotExists() {
    const exists = await this.elasticsearchService.indices.exists({
      index: this.indexName,
    })

    if (!exists) {
      await this.elasticsearchService.indices.create({
        index: this.indexName,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { type: 'text', analyzer: 'standard' },
              filename: { type: 'text' },
              content: { type: 'text', analyzer: 'standard' },
              summary: { type: 'text' },
              fileType: { type: 'keyword' },
              uploadDate: { type: 'date' },
            },
          },
        },
      })
    }
  }

  async indexDocument(document: {
    id: string
    title: string
    filename: string
    content: string
    summary?: string
    fileType: string
    uploadDate: Date
  }) {
    await this.createIndexIfNotExists()

    return await this.elasticsearchService.index({
      index: this.indexName,
      id: document.id,
      body: {
        id: document.id,
        title: document.title,
        filename: document.filename,
        content: document.content,
        summary: document.summary,
        fileType: document.fileType,
        uploadDate: document.uploadDate,
      },
    })
  }

  async search(query: string, size: number = 20) {
    const result = await this.elasticsearchService.search({
      index: this.indexName,
      body: {
        query: {
          multi_match: {
            query,
            fields: ['title^2', 'content', 'summary'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
        highlight: {
          fields: {
            content: {
              fragment_size: 150,
              number_of_fragments: 3,
            },
          },
        },
        size,
      },
    })

    // ".hits" property directly to comply with correct typing
    return result.hits.hits.map((hit: any) => ({
      id: hit._source.id,
      title: hit._source.title,
      filename: hit._source.filename,
      snippet:
        hit.highlight?.content?.[0] ||
        hit._source.content?.substring(0, 200) ||
        '',
      score: hit._score,
      metadata: {
        fileType: hit._source.fileType,
        uploadDate: hit._source.uploadDate,
      },
    }))
  }

  async deleteDocument(id: string) {
    return await this.elasticsearchService.delete({
      index: this.indexName,
      id,
    })
  }
}
