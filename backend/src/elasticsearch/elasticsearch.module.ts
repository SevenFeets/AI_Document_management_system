import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule as NestElasticsearchModule } from '@nestjs/elasticsearch';
import { ElasticsearchService } from './elasticsearch.service';

@Module({
  imports: [
    NestElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
        maxRetries: 10,
        requestTimeout: 60000,
        pingTimeout: 3000,
        sniffOnStart: false, // Disabled for single-node local development
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService, NestElasticsearchModule],
})
export class ElasticsearchModule {}
