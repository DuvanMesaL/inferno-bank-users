# Usamos el ZIP placeholder que creaste en infra/app.zip
# Cada Lambda apunta a un handler distinto dentro del mismo archivo index.mjs

resource "aws_lambda_function" "register" {
  function_name    = "${local.name_prefix}-register"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  timeout          = 10
  handler          = "index.register"
  filename         = "${path.module}/app.zip"
  source_code_hash = filebase64sha256("${path.module}/app.zip")

  environment {
    variables = {
      USER_TABLE                          = aws_dynamodb_table.users.name
      AVATARS_BUCKET                      = aws_s3_bucket.avatars.bucket
      USERS_SECRET_NAME                   = aws_secretsmanager_secret.users_secret.name
      CARD_REQUEST_QUEUE_URL              = aws_sqs_queue.card_requests.url
      JWT_TTL                             = var.jwt_ttl_seconds
      DEBUG_ERRORS                        = "0"
      NOTIFICATIONS_QUEUE_URL             = data.aws_sqs_queue.notifications_events.url
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  tags = { Project = var.project, Stage = var.stage }
}

resource "aws_lambda_function" "login" {
  function_name    = "${local.name_prefix}-login"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  timeout          = 10
  handler          = "index.login"
  filename         = "${path.module}/app.zip"
  source_code_hash = filebase64sha256("${path.module}/app.zip")
  environment { variables = aws_lambda_function.register.environment[0].variables }
  tags = { Project = var.project, Stage = var.stage }
}

resource "aws_lambda_function" "get_profile" {
  function_name    = "${local.name_prefix}-get-profile"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  timeout          = 10
  handler          = "index.getProfile"
  filename         = "${path.module}/app.zip"
  source_code_hash = filebase64sha256("${path.module}/app.zip")
  environment { variables = aws_lambda_function.register.environment[0].variables }
  tags = { Project = var.project, Stage = var.stage }
}

resource "aws_lambda_function" "update_profile" {
  function_name    = "${local.name_prefix}-update-profile"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  timeout          = 10
  handler          = "index.updateProfile"
  filename         = "${path.module}/app.zip"
  source_code_hash = filebase64sha256("${path.module}/app.zip")
  environment { variables = aws_lambda_function.register.environment[0].variables }
  tags = { Project = var.project, Stage = var.stage }
}

resource "aws_lambda_function" "upload_avatar" {
  function_name    = "${local.name_prefix}-upload-avatar"
  role             = aws_iam_role.lambda_role.arn
  runtime          = "nodejs20.x"
  timeout          = 10
  handler          = "index.uploadAvatar"
  filename         = "${path.module}/app.zip"
  source_code_hash = filebase64sha256("${path.module}/app.zip")
  environment { variables = aws_lambda_function.register.environment[0].variables }
  tags = { Project = var.project, Stage = var.stage }
}
