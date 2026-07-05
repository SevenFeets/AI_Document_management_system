import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from '../database/entities/document.entity';
import { DocumentParserService } from './services/document-parser.service';
import { S3Module } from '../s3/s3.module';
import { QueueModule } from '../queue/queue.module';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    S3Module,
    forwardRef(() => QueueModule),
    ElasticsearchModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentParserService],
  exports: [DocumentsService, DocumentParserService],
})
export class DocumentsModule {}

/*
  Registers the DocumentsController and DocumentsService as NestJS modules
  Imports TypeOrmModule to manage the DocumentEntity
  Provides DocumentParserService for document parsing
  Exports DocumentsService so other modules can use it
*/
