import { Test } from 'supertest'

export type UploadFixture = {
  buffer: Buffer
  filename: string
  contentType: string
}

export const fixtures = {
  txt(content = 'Quarterly revenue increased by twelve percent.'): UploadFixture {
    return {
      buffer: Buffer.from(content, 'utf-8'),
      filename: 'report.txt',
      contentType: 'text/plain',
    }
  },

  pdf(): UploadFixture {
    // Minimal PDF accepted by upload validators (content not parsed in upload E2E)
    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
trailer<</Size 4/Root 1 0 R>>
startxref
149
%%EOF`
    return {
      buffer: Buffer.from(pdf, 'utf-8'),
      filename: 'summary.pdf',
      contentType: 'application/pdf',
    }
  },

  docx(): UploadFixture {
    return {
      buffer: Buffer.from('PK docx placeholder', 'utf-8'),
      filename: 'notes.docx',
      contentType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  },

  doc(): UploadFixture {
    return {
      buffer: Buffer.from('DOC placeholder', 'utf-8'),
      filename: 'legacy.doc',
      contentType: 'application/msword',
    }
  },

  largeTxt(sizeBytes: number): UploadFixture {
    const chunk = 'A'.repeat(1024)
    const repeats = Math.ceil(sizeBytes / chunk.length)
    const content = chunk.repeat(repeats).slice(0, sizeBytes)
    return {
      buffer: Buffer.from(content, 'utf-8'),
      filename: 'large-report.txt',
      contentType: 'text/plain',
    }
  },
}

export function attachFixture(
  requestBuilder: Test,
  fixture: UploadFixture,
): Test {
  return requestBuilder.attach('file', fixture.buffer, {
    filename: fixture.filename,
    contentType: fixture.contentType,
  })
}
