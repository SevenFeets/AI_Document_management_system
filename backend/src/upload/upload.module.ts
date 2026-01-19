import { Module } from '@nestjs/common'
import { UploadController } from './upload.controller'
import { UploadService } from './upload.service'
import { DocumentsModule } from '../documents/documents.module'

@Module({
  imports: [DocumentsModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
