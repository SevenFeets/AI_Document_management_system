# Document processor Lambda (Phase 4.3)

Serverless function that runs when objects are created in S3 under `documents/`. It downloads the file, extracts text (txt, pdf, docx), and logs the result.

**See also:** [../README.md](../README.md) — full Terraform overview, what we configured (`ai-pdss`, IAM, deploy commands).

**Note:** The NestJS app already processes uploads via **Bull + Redis**. This Lambda is optional for learning and future serverless workflows. Keep the S3 trigger **disabled** until you choose one processing path (see `enable_s3_trigger` in `../lambda-deploy`).

## Prerequisites

- AWS CLI configured (`aws configure` or env vars)
- Node.js 18+
- Existing bucket: `ai-pdss` in `il-central-1`
- IAM user/role with Lambda + S3 + IAM permissions for deploy

## 1. Package dependencies

```bash
cd terraform/lambda-function
npm run build
```

Creates `terraform/lambda-deploy/lambda_function.zip`.

## 2. Deploy with Terraform

```bash
cd ../lambda-deploy
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars if needed
terraform init
terraform plan
terraform apply
```

## 3. Test without S3 trigger

```bash
aws lambda invoke \
  --function-name ai-pdss-document-processor \
  --region il-central-1 \
  --payload file://../lambda-function/test-event.json \
  --cli-binary-format raw-in-base64-out \
  response.json

type response.json   # Windows
cat response.json    # macOS/Linux
```

Check logs:

```bash
aws logs tail /aws/lambda/ai-pdss-document-processor --region il-central-1 --follow
```

## 4. Enable S3 trigger (optional)

In `terraform.tfvars`:

```hcl
enable_s3_trigger = true
```

Then `terraform apply`. **Warning:** Every app upload to `documents/` will also invoke Lambda while Bull still runs. Disable one path for production.

## Supported file types

| Extension | Library |
|-----------|---------|
| `.txt` | UTF-8 read |
| `.pdf` | `pdf-parse` |
| `.docx`, `.doc` | `mammoth` |

## Console alternative

1. Lambda → Create function → `ai-pdss-document-processor`
2. Runtime Node.js 20.x, upload `lambda_function.zip`
3. Handler `index.handler`, timeout 120s, memory 512 MB
4. Env: `S3_PREFIX=documents/`
5. Role: S3 read on `arn:aws:s3:::ai-pdss/*`, CloudWatch Logs
6. Test with `test-event.json` from this folder
