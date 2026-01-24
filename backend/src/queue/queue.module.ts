import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bull'
import { DocumentProcessor } from './processors/document.processor'
import { QueueService } from './queue.service'
import { DatabaseModule } from '../database/database.module'
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module'
import { S3Module } from '../s3/s3.module'
import { AIServiceModule } from '../ai/ai.module'
import { DocumentsModule } from '../documents/documents.module'

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'document-processing',
    }),
    DatabaseModule,
    ElasticsearchModule,
    S3Module,
    AIServiceModule,
    forwardRef(() => DocumentsModule),
  ],
  providers: [DocumentProcessor, QueueService],
  exports: [QueueService],
})
export class QueueModule {}
