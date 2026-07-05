variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "il-central-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for document storage"
  type        = string
  default     = "document-search-documents"
}

variable "ec2_ami_id" {
  description = "EC2 AMI ID (leave null to use latest Amazon Linux 2 in aws_region)"
  type        = string
  default     = null
  nullable    = true
}

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "ec2_key_name" {
  description = "EC2 key pair name"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}
