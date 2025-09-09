output "api_invoke_url" {
  value = "https://${aws_api_gateway_rest_api.api.id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_stage.stage.stage_name}"
}

output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "avatars_bucket" {
  value = aws_s3_bucket.avatars.bucket
}

output "users_secret_name" {
  value = aws_secretsmanager_secret.users_secret.name
}

output "card_requests_queue_url" {
  value = aws_sqs_queue.card_requests.url
}
