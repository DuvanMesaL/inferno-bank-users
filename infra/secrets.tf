resource "aws_secretsmanager_secret" "users_secret" {
  name = var.users_secret_name
  tags = { Project = var.project, Stage = var.stage }
}
/*
# Versión inicial con valores de ejemplo (¡CAMBIA ESTO LUEGO!)
resource "aws_secretsmanager_secret_version" "users_secret_v" {
  secret_id = aws_secretsmanager_secret.users_secret.id
  secret_string = jsonencode({
    BCRYPT_SALT = "$2a$10$exampleexampleexampleexampleex"
    JWT_SECRET  = "cambia-esto-por-un-secreto-largo"
  })
}
*/