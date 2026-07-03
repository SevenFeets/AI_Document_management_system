import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch'

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name)
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
          settings: {
            analysis: {
              analyzer: {
                autocomplete_analyzer: {
                  type: 'custom',
                  tokenizer: 'autocomplete_tokenizer',
                  filter: ['lowercase'],
                },
              },
              tokenizer: {
                autocomplete_tokenizer: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 10,
                  token_chars: ['letter', 'digit'],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  autocomplete: {
                    type: 'text',
                    analyzer: 'autocomplete_analyzer',
                  },
                },
              },
              filename: {
                type: 'text',
                fields: {
                  autocomplete: {
                    type: 'text',
                    analyzer: 'autocomplete_analyzer',
                  },
                },
              },
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
    try {
      await this.createIndexIfNotExists()

      this.logger.log(
        `Indexing document in Elasticsearch: ${document.id} (${document.filename})`,
      )

      const result = await this.elasticsearchService.index({
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

      this.logger.log(`Successfully indexed document: ${document.id}`)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to index document ${document.id}: ${message}`, error instanceof Error ? error.stack : undefined)
      throw new InternalServerErrorException(`Elasticsearch indexing failed: ${message}`)
    }
  }

  async search(query: string, size: number = 20) {
    const result = await this.elasticsearchService.search({
      index: this.indexName,
      body: {
        track_total_hits: false,
        _source: ['id', 'title', 'filename', 'content', 'fileType', 'uploadDate'],
        query: {
          multi_match: {
            query,
            fields: [
              'title^3',              // Exact title match gets highest boost
              'title.autocomplete^2', // Partial title match
              'filename.autocomplete^2', // Partial filename match
              'content',              // Content search
              'summary',              // Summary search
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        },
        highlight: {
          fields: {
            title: {
              fragment_size: 150,
              number_of_fragments: 1,
            },
            filename: {
              fragment_size: 150,
              number_of_fragments: 1,
            },
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
        hit.highlight?.title?.[0] ||
        hit.highlight?.filename?.[0] ||
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
