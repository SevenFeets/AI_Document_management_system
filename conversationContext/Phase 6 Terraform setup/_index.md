# Phase 6 Terraform setup

**Last updated:** 2026-07-03
**Status:** in progress

## Goal

Complete Phase 6.1 from IMPLEMENTATION_PLAN.md: install Terraform, configure AWS credentials, create S3 state bucket, review and customize Terraform config.

## Decisions

- Existing S3 bucket `ai-pdss` in `il-central-1` stays for dev; root `terraform/` uses new prod bucket name `document-search-prod-documents`
- State backend aligned to `il-central-1` (was `us-east-1`)
- EC2 AMI: auto-resolve latest Amazon Linux 2 via data source (no hardcoded AMI)
- `lambda-deploy/` unchanged — already deployed Phase 4 Lambda

## Done

- Installed Terraform v1.15.7 and AWS CLI v2.35.15 (winget)
- Aligned `terraform/main.tf` backend + `variables.tf` defaults to `il-central-1`
- Updated `terraform.tfvars.example` for production values
- Added `terraform/setup-phase-6.ps1` (credentials check, state bucket, validate)
- Added `terraform/terraform.tfvars` to `.gitignore`
- `terraform validate` passes

## Open / next

- User: `aws configure` with IAM keys (same as backend/.env)
- Run `terraform/setup-phase-6.ps1` to create state bucket
- Edit `terraform/terraform.tfvars` (ec2_key_name, openai_api_key)
- Phase 6.2: `terraform init`, `plan`, `apply`

## Files touched

- `terraform/main.tf`, `variables.tf`, `terraform.tfvars.example`
- `terraform/setup-phase-6.ps1`
- `.gitignore`
