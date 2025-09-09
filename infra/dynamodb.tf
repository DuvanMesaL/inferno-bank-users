resource "aws_dynamodb_table" "users" {
  name         = var.users_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "uuid"
  range_key = "document"

  attribute {
    name = "uuid"
    type = "S"
  }

  attribute {
    name = "document"
    type = "S"
  }

  tags = {
    Project = var.project
    Stage   = var.stage
  }
}
