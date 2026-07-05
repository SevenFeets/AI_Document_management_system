import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('document-processing')
    private documentQueue: Queue,
  ) {}

  async addDocumentProcessingJob(documentId: string, s3Key: string) {
    return await this.documentQueue.add('process-document', {
      documentId,
      s3Key,
    });
  }

  async getJobStatus(jobId: string) {
    const job = await this.documentQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      data: job.data,
    };
  }
}
