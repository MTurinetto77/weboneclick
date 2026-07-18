# Aukan Aire Libre — web-aukan

Sitio web de **Aukan Aire Libre** (pesca y camping): catálogo público, carrito/checkout, contacto y panel de administración.

## Stack

- Next.js 16 (App Router, TypeScript)
- Prisma + MariaDB
- Auth.js (NextAuth v5) con Google OAuth (clientes del shop + admin)
- Imágenes de productos en filesystem (`uploads/`)

## Requisitos locales

- Node.js 20+
- MariaDB en `localhost:3306`
- Credenciales OAuth de Google (login shop y panel admin)

## Setup

1. Clonar el repositorio e instalar dependencias:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
cp .env.example .env
```

Editar `.env`:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `mysql://root:root@localhost:3306/aukan` (local) |
| `AUTH_SECRET` | Secreto aleatorio (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Credenciales OAuth Google |
| `AUTH_URL` | `http://localhost:3000` en local |
| `AUTH_DEV_BYPASS` | `true` para saltar Google en local (se ignora en `production`) |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | Número WhatsApp (ej. `54911...`) |
| `UPLOADS_DIR` | Carpeta de imágenes (`uploads`). En Hostinger preferir ruta persistente si los deploys borran el directorio de la app. |
| `NEXT_PUBLIC_UPLOADS_BASE_URL` | Base pública de imágenes. Default `/api/uploads`. URL final: `{base}/productos/archivo.jpg` → `https://aukanairelibre.com/api/uploads/productos/...`. No usar `hstgr.io`. |
| `SEED_ADMIN_EMAIL` | Mail Google del admin (debe coincidir con la cuenta OAuth) |

3. Crear la base y migrar:

```bash
# En MariaDB: CREATE DATABASE aukan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
npx prisma migrate deploy
npm run db:seed
```

4. Arrancar:

```bash
npm run dev
```

- Sitio: http://localhost:3000  
- Admin: http://localhost:3000/admin/login  
- Cuenta: http://localhost:3000/cuenta  

## Google OAuth

1. En [Google Cloud Console](https://console.cloud.google.com/) crear un proyecto.
2. APIs y servicios → Pantalla de consentimiento OAuth.
3. Credenciales → ID de cliente OAuth → Aplicación web.
4. Orígenes autorizados: `http://localhost:3000` (y el dominio de producción).
5. URI de redirección: `http://localhost:3000/api/auth/callback/google` (y el equivalente en producción).
6. Pegar Client ID y Secret en `.env`.

Cualquier cuenta Google puede iniciar sesión en el shop (se crea `usuario`/`cliente`).  
El **panel admin** solo admite `tipo_usuario = admin` y `activo = true`. El seed crea un admin con `SEED_ADMIN_EMAIL`.

## Estructura principal

- `src/app/(shop)/` — Home, catálogo, carrito, checkout, cuenta, contacto
- `src/app/admin/` — Panel (ventas, productos, categorías, almacenes, características, usuarios)
- `src/app/api/uploads/` — Sirve imágenes desde `UPLOADS_DIR`
- `src/lib/cart.ts` — Carrito por cookie
- `prisma/schema.prisma` — Modelo según DER
- `prisma/seed.ts` — Datos de prueba (~25 productos)

## Documentación

- [docs/ETAPA-2-CARRITO.md](docs/ETAPA-2-CARRITO.md) — detalle de la Etapa 2 (carrito, checkout, ventas)
- [docs/FUTUROS-CAMBIOS.md](docs/FUTUROS-CAMBIOS.md) — guía para seguir desarrollando
- [DER.txt](DER.txt) — modelo de datos

## Despliegue en Hostinger (Business)

1. Crear base MariaDB en hPanel y anotar host, usuario, password y nombre de DB.
2. Crear / configurar la app **Node.js** (Import from GitHub).
3. Comandos recomendados en el panel:
   - **Install:** `npm ci`
   - **Build:** `npm run build`
   - **Start:** `npm start` (usa `PORT` de Hostinger vía `scripts/start-server.mjs`)
   - **Node:** 20.x o 22.x
   - No fijes el puerto en `3000`: Hostinger inyecta `$PORT`.
4. Variables de entorno en el panel (no uses las de local):
   - **`DATABASE_URL`:** usá el host que muestra phpMyAdmin / MySQL Databases.
     - En Hostinger suele ser **`127.0.0.1`**, no `localhost` (con `localhost` Prisma puede fallar la autenticación).
     - Ejemplo:
       ```env
       DATABASE_URL="mysql://USUARIO:PASSWORD@127.0.0.1:3306/u639431874_aukan"
       ```
     - El nombre de la DB debe ser el completo del panel (ej. `u639431874_aukan`).
     - Encodeá caracteres especiales del password (`+`→`%2B`, `$`→`%24`). El guion `-` no hace falta.
   - `AUTH_URL="https://aukanairelibre.com"` (nunca `localhost`)
   - `AUTH_SECRET=...`
   - `AUTH_DEV_BYPASS` en `false` o sin definir
5. Tras el deploy: `npx prisma migrate deploy` (y seed solo si hace falta).
6. Carpeta `uploads/` con permisos de escritura y persistente.
7. Google OAuth redirect: `https://aukanairelibre.com/api/auth/callback/google`.

### Imágenes de productos en Hostinger

**No uses** las URLs del File Manager (`https://srvXXXX-files.hstgr.io/.../files/...`).  
Esa interfaz es solo para administrar archivos en el panel; **no son URLs públicas** del sitio. Por eso a veces “se ven” si estás logueado en Hostinger y fallan en el catálogo para visitantes.

Flujo correcto (el que ya trae la app):

1. El admin sube la imagen → se guarda en disco (`UPLOADS_DIR`, por defecto carpeta `uploads/` junto a la app).
2. En la DB queda un path relativo, ej. `productos/uuid.jpg`.
3. El sitio las muestra como:
   ```text
   https://aukanairelibre.com/api/uploads/productos/uuid.jpg
   ```

Variables en Hostinger:

```env
UPLOADS_DIR="uploads"
NEXT_PUBLIC_UPLOADS_BASE_URL="/api/uploads"
```

Si tras cada deploy se pierden las imágenes, apuntá `UPLOADS_DIR` a una ruta **persistente** fuera del directorio que Hostinger reemplaza en cada deploy (preguntá en hPanel / soporte cuál carpeta sobrevive). Ejemplo (ruta absoluta del servidor):

```env
UPLOADS_DIR="/home/USUARIO/persistent/uploads"
```

Para verificar una imagen subida desde el admin, abrí en el navegador (sesión normal, sin panel Hostinger):

`https://aukanairelibre.com/api/uploads/productos/NOMBRE-DEL-ARCHIVO.jpg`

Si da 404, el archivo no está en `UPLOADS_DIR` de la app Node.

### Si ves HTTP 503 en todo el sitio

La app Node no está respondiendo al proxy.

1. hPanel → app Node → **Logs** / reiniciar.
2. Start command: `npm start` (debe loguear el `PORT` real de Hostinger).
3. Si el log dice `0.0.0.0:3000` y Hostinger asignó otro puerto, el proxy devolverá 503.

## Scripts útiles

```bash
npm run dev          # desarrollo
npm run build        # build producción
npm run db:migrate   # migraciones en desarrollo
npm run db:deploy    # migraciones en producción
npm run db:seed      # datos de prueba
```

## Etapa actual y siguiente

**Etapa 2 (hecha):** carrito, checkout (invitado/Google), registro de ventas, panel de ventas.  
**Etapa 3 (pendiente):** MercadoPago, tarifas de envío, mails, branding definitivo.

Detalle: [docs/ETAPA-2-CARRITO.md](docs/ETAPA-2-CARRITO.md) · Continuación: [docs/FUTUROS-CAMBIOS.md](docs/FUTUROS-CAMBIOS.md).
