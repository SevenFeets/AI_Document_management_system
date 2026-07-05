import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import {
  DocumentEntity,
  DocumentStatus,
} from '../database/entities/document.entity';
import { S3Service } from '../s3/s3.service';
import { QueueService } from '../queue/queue.service';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private s3Service: S3Service,
    private queueService: QueueService,
    private elasticsearchService: ElasticsearchService,
    private configService: ConfigService,
  ) {}

  async findAll() {
    const documents = await this.documentRepository.find({
      order: { uploadDate: 'DESC' },
    });

    return documents.map((doc) => this.toDTO(doc));
  }

  async findOne(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.toDTO(document);
  }

  async uploadDocument(file: Express.Multer.File) {
    const s3Key = `documents/${Date.now()}-${file.originalname}`;
    const bucket = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'document-search',
    );

    // Upload to S3
    await this.s3Service.uploadFile(file, s3Key);

    // Create document record
    const document = this.documentRepository.create({
      title: file.originalname,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      s3Key,
      s3Bucket: bucket,
      status: DocumentStatus.PROCESSING,
    });

    const savedDocument = await this.documentRepository.save(document);

    // Queue document processing
    await this.queueService.addDocumentProcessingJob(savedDocument.id, s3Key);

    return {
      id: savedDocument.id,
      message: 'Document uploaded successfully and queued for processing',
    };
  }

  async delete(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Delete from S3
    await this.s3Service.deleteFile(document.s3Key);

    // Delete from Elasticsearch
    try {
      await this.elasticsearchService.deleteDocument(id);
    } catch (error) {
      this.logger.warn(
        `Elasticsearch delete failed for document ${id}: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Delete from database
    await this.documentRepository.remove(document);

    return { message: 'Document deleted successfully' };
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
    };
  }

  async reindexAllDocuments() {
    // Find all documents with status 'indexed' AND have extracted text
    const indexedDocuments = await this.documentRepository.find({
      where: {
        status: DocumentStatus.INDEXED,
        extractedText: Not(IsNull()),
      },
    });

    this.logger.log(`Found ${indexedDocuments.length} documents to reindex`);

    let successCount = 0;
    let failureCount = 0;

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
        });

        this.logger.log(`Successfully reindexed document: ${document.id}`);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to reindex document ${document.id}: ${error instanceof Error ? error.message : error}`,
        );
        failureCount++;
      }
    }

    return {
      total: indexedDocuments.length,
      success: successCount,
      failed: failureCount,
      message: `Reindexed ${successCount} of ${indexedDocuments.length} documents`,
    };
  }

  async reindexDocument(id: string) {
    // Find document by id
    const document = await this.documentRepository.findOne({
      where: { id },
    });

    // If not found, throw error
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    if (document.status !== DocumentStatus.INDEXED) {
      throw new BadRequestException(
        `Document is not in indexed status. Current status: ${document.status}`,
      );
    }

    if (!document.extractedText) {
      throw new BadRequestException('Document has no extracted text to index');
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
      });

      this.logger.log(`Successfully reindexed document: ${document.id}`);

      return {
        success: true,
        message: `Document ${document.filename} reindexed successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reindex document ${id}: ${error instanceof Error ? error.message : error}`,
      );
      throw new InternalServerErrorException(
        `Failed to reindex document: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
