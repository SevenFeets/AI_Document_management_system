/**
 * S3-triggered document processor (Phase 4.3).
 * Downloads objects under documents/, extracts text, logs result.
 *
 * Full indexing (Postgres, Elasticsearch, OpenAI) stays in the NestJS Bull
 * processor. Enable S3 trigger only when you want this path; see README.md.
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')

const s3 = new S3Client({})
const PREFIX = process.env.S3_PREFIX || 'documents/'

function getExtension(key) {
  const base = key.split('/').pop() || key
  const i = base.lastIndexOf('.')
  return i >= 0 ? base.slice(i + 1).toLowerCase() : ''
}

async function streamToBuffer(body) {
  const chunks = []
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function extractText(buffer, ext) {
  switch (ext) {
    case 'txt':
      return buffer.toString('utf-8')
    case 'pdf': {
      const data = await pdfParse(buffer)
      return data.text || ''
    }
    case 'docx':
    case 'doc': {
      const result = await mammoth.extractRawText({ buffer })
      return result.value || ''
    }
    default:
      throw new Error(`Unsupported file type: ${ext || '(none)'}`)
  }
}

async function processRecord(record) {
  const bucket = record.s3.bucket.name
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

  if (!key.startsWith(PREFIX)) {
    console.log(`Skipping key outside prefix "${PREFIX}": ${key}`)
    return { skipped: true, key }
  }

  console.log(`Processing s3://${bucket}/${key}`)

  const response = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  )
  if (!response.Body) {
    throw new Error(`Empty body for ${key}`)
  }

  const buffer = await streamToBuffer(response.Body)
  const ext = getExtension(key)
  const extractedText = await extractText(buffer, ext)

  const result = {
    bucket,
    key,
    extension: ext,
    extractedLength: extractedText.length,
    preview: extractedText.slice(0, 200),
  }
  console.log('Extracted:', JSON.stringify(result))

  return { skipped: false, ...result }
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event))

  const records = event.Records || []
  if (records.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No S3 records' }) }
  }

  const results = []
  const errors = []

  for (const record of records) {
    try {
      results.push(await processRecord(record))
    } catch (err) {
      console.error('Record failed:', err)
      errors.push({
        key: record.s3?.object?.key,
        message: err.message,
      })
    }
  }

  const statusCode = errors.length === records.length ? 500 : 200
  return {
    statusCode,
    body: JSON.stringify({
      processed: results.length,
      errors: errors.length,
      results,
      errors,
    }),
  }
}
