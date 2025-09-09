# Inferno Bank - Users Microservice

Microservicio encargado de la **gestión de usuarios** dentro del ecosistema de **Inferno Bank**.  
Forma parte de la arquitectura basada en microservicios junto con `transactions` y `notifications`.  

## 🚀 Características
- Registro y autenticación de usuarios.  
- Gestión de credenciales y secretos mediante **AWS Secrets Manager**.  
- Persistencia de datos en **DynamoDB**.  
- Exposición de endpoints a través de **API Gateway**.  
- Procesamiento de eventos e integración con otros microservicios mediante **SQS**.  
- Desplegado en **AWS Lambda** usando **Terraform** como IaC.  

## 📂 Estructura del proyecto
```
infra/              # Definiciones de infraestructura con Terraform
  apigw.tf          # API Gateway
  dynamodb.tf       # Tablas DynamoDB para usuarios
  iam.tf            # Roles y políticas IAM
  lambda.tf         # Configuración de Lambdas
  sqs.tf            # Colas SQS para integración con otros microservicios
  secrets.tf        # Manejo de secretos en AWS Secrets Manager
  variables.tf      # Variables de configuración
  outputs.tf        # Valores de salida de Terraform
app/                # Código de la aplicación
app_stub/           # Archivos base de configuración
README.md           # Documentación del microservicio
```

## ⚙️ Requisitos previos
- [Node.js 20+](https://nodejs.org/)  
- [Terraform](https://www.terraform.io/downloads.html)  
- [AWS CLI](https://aws.amazon.com/cli/) configurado con credenciales válidas  

## 🛠️ Despliegue
1. Inicializar Terraform:
   ```bash
   terraform init
   ```
2. Revisar y aplicar la infraestructura:
   ```bash
   terraform plan
   terraform apply
   ```
3. Obtener el endpoint de la API:
   ```bash
   terraform output api_invoke_url
   ```

## 🌐 Endpoints principales
- `POST /users/register` → Registro de nuevos usuarios.  
- `POST /users/login` → Inicio de sesión y generación de token.  
- `GET /users/{id}` → Obtener datos de un usuario por ID.  

## 🔗 Integraciones
- **Transactions Microservice**: para el manejo de cuentas y movimientos.  
- **Notifications Microservice**: envío de notificaciones automáticas tras eventos de usuario.  

## 📜 Licencia
Proyecto académico para **Sistemas Distribuidos** – Fundiacion Universitaria Colombo Internacional.  
Uso interno con fines educativos.  
