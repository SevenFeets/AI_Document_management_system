import { Processor, Process } from '@nestjs/bull'
import { Job } from 'bull'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DocumentEntity, DocumentStatus } from '../../database/entities/document.entity'
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service'
import { S3Service } from '../../s3/s3.service'
import { AIService } from '../../ai/ai.service'
import { DocumentParserService } from '../../documents/services/document-parser.service'

@Processor('document-processing')
@Injectable()
export class DocumentProcessor {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private elasticsearchService: ElasticsearchService,
    private s3Service: S3Service,
    private aiService: AIService,
    private documentParserService: DocumentParserService,
  ) {}

  @Process('process-document')
  async handleDocumentProcessing(job: Job<{ documentId: string; s3Key: string }>) {
    const { documentId, s3Key } = job.data

    try {
      job.progress(10)

      // Fetch document from database
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
      })

      if (!document) {
        throw new Error(`Document ${documentId} not found`)
      }

      // Download file from S3
      job.progress(20)
      const fileUrl = await this.s3Service.getFileUrl(s3Key)
      // In production, you'd download the actual file content here
      // For now, we'll simulate this

      // Parse document content
      job.progress(40)
      const extractedText = await this.documentParserService.parseDocument(
        s3Key,
        document.fileType,
      )

      // Update document with extracted text
      document.extractedText = extractedText
      await this.documentRepository.save(document)

      // Generate summary using AI
      job.progress(60)
      const summary = await this.aiService.generateSummary(extractedText)
      document.summary = summary
      document.status = DocumentStatus.INDEXED
      await this.documentRepository.save(document)

      // Index in Elasticsearch
      job.progress(80)
      await this.elasticsearchService.indexDocument({
        id: document.id,
        title: document.title,
        filename: document.filename,
        content: extractedText,
        summary: summary,
        fileType: document.fileType,
        uploadDate: document.uploadDate,
      })

      job.progress(100)
      return { success: true, documentId }
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error)

      // Update document status to error
      await this.documentRepository.update(documentId, {
        status: DocumentStatus.ERROR,
      })

      throw error
    }
  }
}
