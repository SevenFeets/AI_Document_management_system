# Phase 6.1 — Terraform prerequisites (run from terraform/)
# Requires: Terraform + AWS CLI on PATH, IAM user with S3 create permissions.

$ErrorActionPreference = "Stop"
$StateBucket = "document-search-terraform-state"
$Region = "il-central-1"

Write-Host "=== Phase 6.1: Terraform setup ===" -ForegroundColor Cyan

Write-Host "`n1. Tool versions"
terraform version
aws --version

Write-Host "`n2. AWS identity (configure with: aws configure)"
$identity = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "AWS credentials not configured." -ForegroundColor Yellow
    Write-Host "Run: aws configure"
    Write-Host "Use the same keys as backend/.env (IAM user yaroslav@Dev or equivalent)."
    exit 1
}
Write-Host $identity

Write-Host "`n3. Terraform state bucket ($StateBucket in $Region)"
$head = aws s3api head-bucket --bucket $StateBucket 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Bucket already exists." -ForegroundColor Green
} else {
    Write-Host "Creating state bucket..."
    aws s3api create-bucket `
        --bucket $StateBucket `
        --region $Region `
        --create-bucket-configuration LocationConstraint=$Region
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    aws s3api put-bucket-versioning `
        --bucket $StateBucket `
        --versioning-configuration Status=Enabled
    Write-Host "State bucket created." -ForegroundColor Green
}

Write-Host "`n4. terraform.tfvars"
if (-not (Test-Path "terraform.tfvars")) {
    Copy-Item "terraform.tfvars.example" "terraform.tfvars"
    Write-Host "Created terraform.tfvars from example — edit ec2_key_name and openai_api_key." -ForegroundColor Yellow
} else {
    Write-Host "terraform.tfvars already exists." -ForegroundColor Green
}

Write-Host "`n5. Validate configuration (syntax only)"
terraform fmt -check -recursive 2>$null
terraform init -backend=false
terraform validate

Write-Host "`n=== Phase 6.1 complete ===" -ForegroundColor Cyan
Write-Host "Next (Phase 6.2): terraform init && terraform plan && terraform apply"
