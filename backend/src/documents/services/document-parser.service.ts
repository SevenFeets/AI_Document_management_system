import { Injectable } from '@nestjs/common'
import { S3Service } from '../../s3/s3.service'
import * as pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import { Readable } from 'stream'

// Pseudo code for DocumentParserService:
// 1. Download file from S3 using s3Service.downloadFile()
// 2. Check file type (PDF, Word, or text)
// 3. Parse based on type:
//    - PDF: use pdfParse library
//    - Word: use mammoth.extractRawText()
//    - Text: convert buffer to string
// 4. Return extracted text
// 5. Handle errors for unsupported types

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
