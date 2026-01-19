import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DocumentsModule } from './documents/documents.module'
import { SearchModule } from './search/search.module'
import { UploadModule } from './upload/upload.module'
import { DatabaseModule } from './database/database.module'
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module'
import { QueueModule } from './queue/queue.module'
import { AIServiceModule } from './ai/ai.module'
import { S3Module } from './s3/s3.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ElasticsearchModule,
    QueueModule,
    AIServiceModule,
    S3Module,
    DocumentsModule,
    SearchModule,
    UploadModule,
  ],
})
export class AppModule {}
