import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, IsNull } from 'typeorm'
import { DocumentEntity, DocumentStatus } from '../database/entities/document.entity'
import { S3Service } from '../s3/s3.service'
import { QueueService } from '../queue/queue.service'
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service'

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private s3Service: S3Service,
    private queueService: QueueService,
    private elasticsearchService: ElasticsearchService,
  ) {}

  async findAll() {
    const documents = await this.documentRepository.find({
      order: { uploadDate: 'DESC' },
    })

    return documents.map((doc) => this.toDTO(doc))
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
    })

    if (!document) {
      throw new Error(`Document with ID ${id} not found`)
    }

    return this.toDTO(document)
  }

  async uploadDocument(file: Express.Multer.File) {
    const s3Key = `documents/${Date.now()}-${file.originalname}`
    const bucket = process.env.AWS_S3_BUCKET || 'document-search'

    // Upload to S3
    await this.s3Service.uploadFile(file, s3Key)

    // Create document record
    const document = this.documentRepository.create({
      title: file.originalname,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      s3Key,
      s3Bucket: bucket,
      status: DocumentStatus.PROCESSING,
    })

    const savedDocument = await this.documentRepository.save(document)

    // Queue document processing
    await this.queueService.addDocumentProcessingJob(savedDocument.id, s3Key)

    return {
      id: savedDocument.id,
      message: 'Document uploaded successfully and queued for processing',
    }
  }

  async delete(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
    })

    if (!document) {
      throw new Error(`Document with ID ${id} not found`)
    }

    // Delete from S3
    await this.s3Service.deleteFile(document.s3Key)

    // Delete from Elasticsearch
    try {
      await this.elasticsearchService.deleteDocument(id)
    } catch (error) {
      console.error('Error deleting from Elasticsearch:', error)
    }

    // Delete from database
    await this.documentRepository.remove(document)

    return { message: 'Document deleted successfully' }
  }

  private toDTO(document: DocumentEntity) {
    return {
      id: document.id,
      title: document.title,
      filename: document.filename,
      fileType: document.fileType,
      fileSize: document.fileSize,
      uploadDate: document.uploadDate.toISOString(),
      status: document.status,
      summary: document.summary,
      metadata: document.metadata,
    }
  }

  async reindexAllDocuments() {
    // Find all documents with status 'indexed' AND have extracted text
    const indexedDocuments = await this.documentRepository.find({
      where: {
        status: DocumentStatus.INDEXED,
        extractedText: Not(IsNull()),
      },
    })

    console.log(`Found ${indexedDocuments.length} documents to reindex`)

    let successCount = 0
    let failureCount = 0

    // Loop through each document and reindex
    for (const document of indexedDocuments) {
      try {
        // Index in Elasticsearch
        await this.elasticsearchService.indexDocument({
          id: document.id,
          title: document.title,
          filename: document.filename,
          content: document.extractedText,
          summary: document.summary,
          fileType: document.fileType,
          uploadDate: document.uploadDate,
        })

        console.log(`Successfully reindexed document: ${document.id}`)
        successCount++
      } catch (error) {
        console.error(`Failed to reindex document ${document.id}:`, error.message)
        failureCount++
      }
    }

    return {
      total: indexedDocuments.length,
      success: successCount,
      failed: failureCount,
      message: `Reindexed ${successCount} of ${indexedDocuments.length} documents`,
    }
  }
  
  async reindexDocument(id: string) {
    // Find document by id
    const document = await this.documentRepository.findOne({
      where: { id },
    })

    // If not found, throw error
    if (!document) {
      throw new Error(`Document with ID ${id} not found`)
    }

    // If status is not 'indexed', throw error
    if (document.status !== DocumentStatus.INDEXED) {
      throw new Error(`Document is not in indexed status. Current status: ${document.status}`)
    }

    // If no extractedText, throw error
    if (!document.extractedText) {
      throw new Error(`Document has no extracted text to index`)
    }

    // Call elasticsearchService.indexDocument()
    try {
      await this.elasticsearchService.indexDocument({
        id: document.id,
        title: document.title,
        filename: document.filename,
        content: document.extractedText,
        summary: document.summary,
        fileType: document.fileType,
        uploadDate: document.uploadDate,
      })

      console.log(`Successfully reindexed document: ${document.id}`)

      return {
        success: true,
        message: `Document ${document.filename} reindexed successfully`,
      }
    } catch (error) {
      console.error(`Failed to reindex document ${id}:`, error.message)
      throw new Error(`Failed to reindex document: ${error.message}`)
    }
  }
}
