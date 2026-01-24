import { Injectable } from '@nestjs/common'
import { S3Service } from '../../s3/s3.service'
import * as pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import { Readable } from 'stream'

@Injectable()
export class DocumentParserService {
  constructor(private s3Service: S3Service) {}

  async parseDocument(s3Key: string, fileType: string): Promise<string> {
    const fileBuffer = await this.s3Service.downloadFile(s3Key)
    if (fileType.includes('pdf')) {
      const pdf = await pdfParse(fileBuffer)
      return pdf.text
    }
    else if (fileType.includes('word') ||
    fileType.includes('docx') || 
    fileType.includes('doc')) {
      const text = (await mammoth.extractRawText({buffer: fileBuffer})).value
      return text
    }
    else if (fileType.includes('text') || fileType.includes('plain')) {
      return fileBuffer.toString('utf-8')
    }

    throw new Error(`Unsupported file type: ${fileType}`)
  }
}
