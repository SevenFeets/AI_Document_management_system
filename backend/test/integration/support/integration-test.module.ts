import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DocumentsController } from '../../../src/documents/documents.controller'
import { DocumentsService } from '../../../src/documents/documents.service'
import { SearchController } from '../../../src/search/search.controller'
import { SearchService } from '../../../src/search/search.service'
import { DocumentEntity } from '../../../src/database/entities/document.entity'
import { externalServiceMocks } from './mocks'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [
        () => ({
          NODE_ENV: 'test',
          PORT: 4000,
          LOG_LEVEL: 'error',
          AWS_S3_BUCKET: 'test-bucket',
          FRONTEND_URL: 'http://localhost:3000',
        }),
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'document_search_test',
      entities: [DocumentEntity],
      synchronize: true,
      retryAttempts: 1,
      retryDelay: 300,
    }),
    TypeOrmModule.forFeature([DocumentEntity]),
  ],
  controllers: [DocumentsController, SearchController],
  providers: [DocumentsService, SearchService, ...externalServiceMocks],
})
export class IntegrationTestModule {}
