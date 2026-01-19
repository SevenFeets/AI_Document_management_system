import { Controller } from '@nestjs/common'
import { UploadService } from './upload.service'

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}
}
