import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';
import { IntegrationTestModule } from './integration-test.module';
import {
  mockAIService,
  mockElasticsearchService,
  mockQueueService,
  mockS3Service,
  resetExternalMocks,
} from './mocks';

export type IntegrationTestContext = {
  app: INestApplication;
  moduleFixture: TestingModule;
  mocks: {
    s3: typeof mockS3Service;
    queue: typeof mockQueueService;
    elasticsearch: typeof mockElasticsearchService;
    ai: typeof mockAIService;
  };
};

export async function createIntegrationTestApp(): Promise<IntegrationTestContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [IntegrationTestModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const configService = app.get(ConfigService);

  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  resetExternalMocks();

  return {
    app,
    moduleFixture,
    mocks: {
      s3: mockS3Service,
      queue: mockQueueService,
      elasticsearch: mockElasticsearchService,
      ai: mockAIService,
    },
  };
}
