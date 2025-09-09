# Rol para que Lambda pueda ejecutarse
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "${local.name_prefix}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Permisos básicos de logs
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Política personalizada (Dynamo, S3, Secrets, SQS: SendMessage)
data "aws_iam_policy_document" "lambda_inline" {
  statement {
    sid       = "DynamoAccess"
    actions   = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"]
    resources = [aws_dynamodb_table.users.arn]
  }

  statement {
    sid       = "S3Access"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.avatars.arn}/*"]
  }

  statement {
    sid       = "SecretsAccess"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.users_secret.arn]
  }

  statement {
    sid       = "SQSSend"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.card_requests.arn]
  }
}

resource "aws_iam_role_policy" "lambda_inline" {
  name   = "${local.name_prefix}-lambda-inline"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_inline.json
}
