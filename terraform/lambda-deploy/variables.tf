variable "aws_region" {
  description = "AWS region (must match the S3 bucket)"
  type        = string
  default     = "il-central-1"
}

variable "environment" {
  description = "Environment tag"
  type        = string
  default     = "development"
}

variable "s3_bucket_name" {
  description = "Existing S3 bucket for documents"
  type        = string
  default     = "ai-pdss"
}

variable "s3_prefix" {
  description = "Only process keys with this prefix"
  type        = string
  default     = "documents/"
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
  default     = "ai-pdss-document-processor"
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 120
}

variable "lambda_memory_size" {
  description = "Lambda memory in MB"
  type        = number
  default     = 512
}

variable "enable_s3_trigger" {
  description = "Attach S3 ObjectCreated trigger (off by default to avoid duplicate processing with Bull)"
  type        = bool
  default     = false
}
