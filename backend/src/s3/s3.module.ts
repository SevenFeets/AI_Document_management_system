import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';

@Module({
  imports: [ConfigModule],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}

/*
  Registers the S3Service as a NestJS module
  Imports ConfigModule to access environment variables
  Provides S3Service for file storage and retrieval
  Exports S3Service so other modules can use it
*/
