# Cola a la que el servicio de users enviará solicitudes de creación de tarjetas
resource "aws_sqs_queue" "card_requests" {
  name = "${local.name_prefix}-card-requests"
  tags = { Project = var.project, Stage = var.stage }
}

data "aws_sqs_queue" "notifications_events" {
  name = "inferno-bank-notifications-dev-events"
}