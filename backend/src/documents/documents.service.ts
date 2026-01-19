import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
}
