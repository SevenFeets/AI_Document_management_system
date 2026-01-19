import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum DocumentStatus {
  PROCESSING = 'processing',
  INDEXED = 'indexed',
  ERROR = 'error',
}

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column()
  filename: string

  @Column()
  fileType: string

  @Column('bigint')
  fileSize: number

  @Column()
  s3Key: string

  @Column()
  s3Bucket: string

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PROCESSING,
  })
  status: DocumentStatus

  @Column('text', { nullable: true })
  summary: string

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>

  @Column('text', { nullable: true })
  extractedText: string

  @CreateDateColumn()
  uploadDate: Date

  @UpdateDateColumn()
  updatedAt: Date
}
