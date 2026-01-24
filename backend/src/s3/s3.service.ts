import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'
import * as fs from 'fs/promises'
import * as path from 'path'


@Injectable()
export class S3Service {
  private s3Client: S3Client
  private bucketName: string
  private useLocalStorage: boolean
  private localStoragePath: string

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID', '')
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY', '')
    
    // Use local storage if AWS credentials are not configured or are test values
    this.useLocalStorage = !accessKeyId || !secretAccessKey || 
                           accessKeyId === 'test' || accessKeyId === 'your_key_here'
    
    if (this.useLocalStorage) {
      this.localStoragePath = path.join(process.cwd(), 'uploads')
      console.log('Using local storage for file uploads at:', this.localStoragePath)
    } else {
      this.s3Client = new S3Client({
        region: this.configService.get('AWS_REGION', 'us-east-1'),
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
      this.bucketName = this.configService.get('AWS_S3_BUCKET', 'document-search')
      console.log('Using AWS S3 for file uploads')
    }
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    if (this.useLocalStorage) {
      // Save file locally
      const filePath = path.join(this.localStoragePath, key)
      const dir = path.dirname(filePath)
      
      // Create directory if it doesn't exist
      await fs.mkdir(dir, { recursive: true })
      
      // Write file
      await fs.writeFile(filePath, file.buffer)
      
      console.log('File saved locally:', filePath)
      return key
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await this.s3Client.send(command)
    return key
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.useLocalStorage) {
      // For local storage, return a local file path URL
      const filePath = path.join(this.localStoragePath, key)
      return `file://${filePath}`
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    return await getSignedUrl(this.s3Client, command, { expiresIn })
  }

  async deleteFile(key: string): Promise<void> {
    if (this.useLocalStorage) {
      const filePath = path.join(this.localStoragePath, key)
      await fs.unlink(filePath).catch(() => {
        // Ignore error if file doesn't exist
      })
      return
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.s3Client.send(command)
  }

  async downloadFile(key: string): Promise<Buffer> {
    if (this.useLocalStorage) {
      const filePath = path.join(this.localStoragePath, key)
      return await fs.readFile(filePath)
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    const response = await this.s3Client.send(command)
    if (!response.Body) {
      throw new Error(`File ${key} not found in S3`)
    }

    const stream = response.Body as Readable
    return await this.streamToBuffer(stream)
  }

  // Helper method to convert stream to buffer
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = []
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    
    return Buffer.concat(chunks)
  }
}

