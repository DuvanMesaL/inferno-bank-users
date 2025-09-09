resource "aws_s3_bucket" "avatars" {
  bucket        = "${local.name_prefix}-avatars-${random_id.suffix.hex}"
  force_destroy = true

  tags = {
    Project = var.project
    Stage   = var.stage
  }
}
