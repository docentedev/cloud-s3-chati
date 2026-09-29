# chati — React + Cognito (solo login)

App: https://d3nchyae80v81y.cloudfront.net

## Qué hace

1. Botón "Ingresar con Cognito" → redirige al Hosted UI.
2. Cognito devuelve el `code` → la app lo canjea por tokens.
3. Muestra email, sub, grupos y los claims del `id_token` decodificado.
4. Lista los productos con `GET /api/products` (API Gateway + authorizer JWT,
   usando el `id_token` como `Bearer`).
5. Botón "Cerrar sesión" → limpia la sesión local.

## Paso a paso

```bash
# 1. Instalar
npm install

# 2. Desarrollo local
npm run dev

# 3. Compilar
npm run build

# 4. Publicar en S3 + limpiar caché de CloudFront
aws s3 sync dist/ s3://cloud-s3-chati --delete
aws cloudfront create-invalidation --distribution-id E14JJ18WEECQCL --paths "/*"
```

El push a `main` hace lo mismo solo vía GitHub Actions (requiere los secrets del `DEPLOY-S3.md`).

## Configurar S3 + CloudFront desde cero

> Por qué: S3 guarda los archivos, CloudFront les pone HTTPS (Cognito lo exige).

**0. Instalar y configurar AWS CLI:**

macOS:
```bash
brew install awscli
```

Git Bash (Windows): descargar el instalador MSI desde
`https://awscli.amazonaws.com/AWSCLIV2.msi`, instalar y reabrir Git Bash.

Verificar + configurar credenciales. Mira lo que descargaste y elige:

- **Solo 2 valores** (access key + secret key) → cuenta con keys permanentes:
```bash
aws configure
# AWS Access Key ID:     <pegar access key>
# AWS Secret Access Key: <pegar secret key>
# Default region name:   us-east-1
# Default output format: json
```
- **3 valores** (además `session token`) → **LabRole del ramo (sin permisos IAM)**:
  las keys salen del panel del laboratorio (botón AWS Details → "AWS CLI: Show")
  y **expiran cada pocas horas**. Guárdalas así (`aws configure` interactivo no
  pide el token y sin él nada funciona):
```bash
aws configure set aws_access_key_id <del lab>
aws configure set aws_secret_access_key <del lab>
aws configure set aws_session_token <del lab>
aws configure set region us-east-1
```
```bash
aws --version
aws sts get-caller-identity  # debe mostrar tu LabRole si quedó bien
```

> LabRole: no puedes crear usuarios IAM ni access keys → el deploy es **solo manual**
> por CLI (paso 7). GitHub Actions necesita keys permanentes, así que ese camino no
> aplica. Si un comando falla con `ExpiredToken`, repite este paso 0 (las credenciales
> del lab se renuevan).

**1. Crear el bucket** (nombre único global, minúsculas, sin espacios):

```bash
aws s3api create-bucket --bucket tu-bucket --region us-east-1
```

**2. Subir la app compilada:**

```bash
npm run build
aws s3 sync dist/ s3://tu-bucket --delete
```

**3. Crear el Origin Access Control** (permiso para que CloudFront lea el bucket):

```bash
aws cloudfront create-origin-access-control --origin-access-control-config 'Name=tu-app-oac,SigningBehavior=always,SigningProtocol=sigv4,OriginAccessControlOriginType=s3'
```

Anota el `Id` que devuelve (ej: `EF2NNTX154CQN`). El `Name` es solo una etiqueta para reconocerlo en la consola, no tiene que coincidir con nada más; lo que conecta todo es el `Id`.

**4. Crear la distribución** — es la configuración que le dice a CloudFront qué contenido
servir (tu bucket), con qué dominio HTTPS público y qué reglas aplicar (redirigir a
HTTPS, qué mostrar en cada ruta y en cada error). Una distribución = un sitio publicado.
Con este JSON (`cf-dist.json`), reemplazando `tu-bucket` y el `OriginAccessControlId`:

```json
{
  "CallerReference": "chati-1",
  "Comment": "chati React app",
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-origen",
        "DomainName": "tu-bucket.s3.us-east-1.amazonaws.com",
        "S3OriginConfig": { "OriginAccessIdentity": "" },
        "OriginAccessControlId": "PEGA-EL-ID-DEL-PASO-3"
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-origen",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 60 },
      { "ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 60 }
    ]
  }
}
```

```bash
aws cloudfront create-distribution --distribution-config file://cf-dist.json
```

Anota el `Id` (ej: `E14JJ18WEECQCL`) y el `DomainName` (ej: `xxx.cloudfront.net`).

**5. Darle permiso al bucket** (solo CloudFront puede leer, nadie más):

```bash
aws s3api put-bucket-policy --bucket tu-bucket --policy '{"Version":"2012-10-17","Statement":[{"Sid":"AllowCloudFrontOAC","Effect":"Allow","Principal":{"Service":"cloudfront.amazonaws.com"},"Action":"s3:GetObject","Resource":"arn:aws:s3:::tu-bucket/*","Condition":{"StringEquals":{"AWS:SourceArn":"arn:aws:cloudfront::TU-CUENTA:distribution/TU-DIST-ID"}}}]}'

aws s3api put-public-access-block --bucket tu-bucket --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'
```

**6. Esperar el despliegue** (5-15 min) y probar:

```bash
aws cloudfront wait distribution-deployed --id TU-DIST-ID
```

Abre `https://TU-DOMINIO.cloudfront.net` en el navegador.

**7. Después de cada cambio**, republicar y limpiar caché:

```bash
npm run build
aws s3 sync dist/ s3://tu-bucket --delete
aws cloudfront create-invalidation --distribution-id TU-DIST-ID --paths "/*"
```

> ¿Y el workflow de GitHub Actions? Hace **solo este paso 7** en automático
> (compilar + subir + invalidar) cada vez que hay push a `main`. Los pasos 0-6
> (bucket, OAC, distribución, permisos) son infraestructura y se hacen **una sola
> vez a mano**; el workflow no los crea. Además requiere secrets con keys
> permanentes, así que con LabRole no aplica.

## Config Cognito (src/main.tsx)

- Pool: `us-east-2_ZhTULhf5B` (`us-east-2`)
- App client: `4fm8oratn2rgup09trhbrdk3gd`
- Callback: `https://d3nchyae80v81y.cloudfront.net/`
- Flujo: `code` + scopes `email openid phone`

Si cambias de pool/cliente/dominio, edita esos valores en `src/main.tsx` y registra las callback URLs en Cognito.
