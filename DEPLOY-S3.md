# Deploy chati → S3 + CloudFront (sitio con HTTPS)

URL oficial (HTTPS): **https://d3nchyae80v81y.cloudfront.net**

Usa siempre esta URL: Cognito exige HTTPS y el endpoint HTTP directo de S3 ya no funciona (el bucket quedó privado, solo CloudFront puede leerlo).

Repo: `cloud-s3-chati` (este). El workflow vive en `.github/workflows/deploy-s3.yml`.

---

## 1. Lo que ya está listo en AWS (no repetir)

- Bucket **`cloud-s3-chati`** en `us-east-1`, **privado**: solo CloudFront puede leerlo (Origin Access Control `chati-oac`).
- Distribución CloudFront **`E14JJ18WEECQCL`** (`d3nchyae80v81y.cloudfront.net`): HTTPS con redirect automático, `index.html` como root, errores 403/404 → `/index.html` (200) para SPA.
- Primera subida hecha con `aws s3 sync dist/ s3://cloud-s3-chati --delete` (verificado: HTTPS 200 con `<title>chati</title>`).

Si algún día hay que recrearlo, los comandos son:

```bash
aws s3api create-bucket --bucket cloud-s3-chati --region us-east-1
aws s3api put-public-access-block --bucket cloud-s3-chati \
  --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'
# OJO: no activar "static website hosting": CloudFront usa el endpoint REST del bucket (permite OAC).
# Si lo activas, la consola muestra un aviso recomendando el endpoint website: se ignora.
aws s3api put-bucket-policy --bucket cloud-s3-chati --policy '{"Version":"2012-10-17","Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::cloud-s3-chati/*"}]}'
```

---

## 2. Secrets de GitHub (para que Actions pueda subir)

Viven en GitHub, los usa el workflow. Tu código no los lee.

| Secret en GitHub | Valor |
|---|---|
| `AWS_ACCESS_KEY_ID` | Tu access key (la de tu Mac sirve para la clase: `cat ~/.aws/credentials`) |
| `AWS_SECRET_ACCESS_KEY` | Tu secret key (solo se muestra una vez al crearla) |
| `AWS_REGION` | `us-east-1` |
| `S3_BUCKET_NAME` | `cloud-s3-chati` |
| `CLOUDFRONT_DISTRIBUTION_ID` *(recomendado)* | `E14JJ18WEECQCL` (para invalidar el caché en cada deploy; sin esto los cambios demoran en verse) |

Dónde agregarlos: en GitHub abre `cloud-s3-chati` → **Settings → Secrets and variables → Actions** → **New repository secret**, uno por uno.

> Nota para clases: puedes reusar tus claves del Mac. En producción se crearía un usuario IAM limitado (solo `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` sobre este bucket). Rota o elimina las keys al terminar el ramo.

---

## 3. Cómo publicar cambios (paso a paso)

1. Trabaja normal en este repo y haz push a `main`:
   ```bash
   git add -A
   git commit -m "lo que sea"
   git push origin main
   ```
2. El workflow corre solo: `npm ci` → `npm run build` → `aws s3 sync dist/` al bucket.
3. Verifica en **Actions** que el run esté en verde y recarga la URL pública (si ves la versión vieja, es caché: Cmd+Shift+R).
4. Despliegue manual (sin GitHub), si lo necesitas:
   ```bash
   npm run build
   aws s3 sync dist/ s3://cloud-s3-chati --delete
   ```

---

## 4. Conectar login con Cognito (por qué existe CloudFront)

Cognito (Hosted UI / OAuth) solo acepta URLs de retorno **HTTPS**, y S3 website solo da HTTP: por eso el sitio se sirve por CloudFront.

En Cognito → User pools → tu pool → App clients → tu app client, configura:

| Campo | Valor |
|---|---|
| `Allowed callback URLs` | `https://d3nchyae80v81y.cloudfront.net/` (agrega una línea por cada ruta de retorno, ej: `.../login`, `.../callback`) |
| `Allowed sign-out URLs` | `https://d3nchyae80v81y.cloudfront.net/` |
| `Allowed OAuth flows` | `Authorization code grant` (recomendado para SPA con PKCE) |
| `Allowed OAuth scopes` | `openid`, `email`, `profile` (según lo que pida tu app) |

Ojo: cada URL debe calzar **exacta** (protocolo, dominio y path). Si Cognito responde `redirect_mismatch`, es que la URL de tu app no está en esa lista.

> Nota: si agregas rutas nuevas en la app (ej: `/callback`), súmalas a `Allowed callback URLs`; no hay que tocar nada en S3/CloudFront.

---

## 5. Checklist rápido si falla

- `AccessDenied` en el sync: claves malas o usuario sin permiso `s3:PutObject` sobre el bucket.
- `NoSuchBucket`: el `S3_BUCKET_NAME` está mal escrito o apunta a otra región.
- Veo la versión vieja: es caché (del navegador o de CloudFront). Navegador: Cmd+Shift+R. CloudFront: crea una invalidación `/*` en la distribución `E14JJ18WEECQCL`, o espera ~1 min (errores) / el TTL del caché.
- `redirect_mismatch` en Cognito: la URL de retorno no está en `Allowed callback URLs` (revisa punto 4, debe ser la HTTPS de CloudFront, no la de S3).

- `AccessDenied` en el sync: claves malas o usuario sin permiso `s3:PutObject` sobre el bucket.
- `NoSuchBucket`: el `S3_BUCKET_NAME` está mal escrito o apunta a otra región.
- Veo la versión vieja: es caché del navegador, recarga con Cmd+Shift+R.
- Ruta `/algo` en blanco o 404 pelado: revisa que el error document siga en `index.html` (S3 → bucket → Properties → Static website hosting).
