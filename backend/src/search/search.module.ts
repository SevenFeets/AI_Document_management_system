import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { AIServiceModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [ElasticsearchModule, AIServiceModule, DocumentsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
