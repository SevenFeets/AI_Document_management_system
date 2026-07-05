output "lambda_function_name" {
  description = "Deployed Lambda function name"
  value       = aws_lambda_function.document_processor.function_name
}

output "lambda_function_arn" {
  description = "Deployed Lambda function ARN"
  value       = aws_lambda_function.document_processor.arn
}

output "lambda_role_arn" {
  description = "IAM role ARN used by Lambda"
  value       = aws_iam_role.lambda.arn
}

output "log_group_name" {
  description = "CloudWatch log group for Lambda"
  value       = aws_cloudwatch_log_group.lambda.name
}

output "s3_trigger_enabled" {
  description = "Whether S3 invokes Lambda on new objects"
  value       = var.enable_s3_trigger
}
