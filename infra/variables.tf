variable "project" { default = "inferno-bank-users" }
variable "stage" { default = "dev" }
variable "region" { default = "us-east-1" }

# Nombres base (puedes cambiarlos)
variable "users_table_name" { default = "user-table" }

# Secrets
variable "users_secret_name" { default = "inferno-users-secrets" }

# JWT TTL (segundos) para cuando hagamos el login real
variable "jwt_ttl_seconds" { default = 3600 }
