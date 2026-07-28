# Aukan Aire Libre — guía para futuros cambios

Documento de referencia para continuar el desarrollo de **web-aukan** (aukanairelibre.com).  
Complementa el [README](../README.md) y el modelo de datos en [DER.txt](../DER.txt).

---

## 1. Estado actual (etapa 2)

### Entregado (etapa 1 + 2)

| Área | Qué hay |
|------|---------|
| Sitio público | Home, catálogo con filtros, detalle, contacto, cuenta |
| Carrito / checkout | Cookie + `/carrito`, checkout invitado o Google, confirmación de venta |
| Consulta | WhatsApp solo si stock 0 / sin precio |
| Admin | Dashboard, **ventas**, productos, categorías, características, almacenes, usuarios |
| Auth | Google OAuth para clientes y admin; bypass local (`AUTH_DEV_BYPASS`); `/admin` exige rol admin |
| Datos | Prisma + MariaDB: catálogo + `cliente` / `direccion` / `venta` / `pago` / `envio` |
| Imágenes | Filesystem `uploads/` + route `/api/uploads/[...path]` |
| Diseño | CSS básico en `src/app/globals.css` |

### Documentación Etapa 2

Ver detalle completo en [ETAPA-2-CARRITO.md](./ETAPA-2-CARRITO.md).

### Fuera de alcance (etapa 3+)

- Pasarela MercadoPago
- Tarifas de envío reales / tracking operativo
- Cambio de estado de ventas desde admin
- Envío de mails desde el servidor
- CSS / identidad visual definitiva de marca
- Historial de pedidos en la cuenta del cliente
- CDN o storage externo de imágenes

---

## 2. Stack y convenciones

| Pieza | Detalle |
|-------|---------|
| Framework | Next.js **16** App Router + TypeScript |
| Auth | Auth.js / NextAuth **v5** (`src/auth.ts`) |
| ORM | Prisma **6** + MariaDB (`prisma/schema.prisma`) |
| Mutaciones admin | Server Actions en `src/app/admin/actions.ts` |
| Protección rutas | `src/proxy.ts` (Next 16: `proxy`, no `middleware`) + `requireAdmin()` |
| Estilos | CSS global con variables; sin librería UI |
| Build Hostinger | `npm start` con `scripts/start-server.mjs` (respeta `PORT`); sin `standalone` |

### Reglas de producto ya establecidas en admin

1. **Listado vs alta**: listados con búsqueda/paginación; alta en `/nuevo` (productos, usuarios, **promociones**, **banners**).
2. **Edición**: página aparte `/[id]` (productos, categorías, características, usuarios, promociones, banners).
3. **Tablas** para asociaciones (categorías en producto, características en categoría, categorías/productos en promoción).
4. **Borrado condicionado**:
   - Característica: no eliminar si tiene `producto_caracteristica`.
   - Almacén: no eliminar si tiene filas en `stock`.
5. **Baja lógica** de productos: campo `activo` (no hard delete en catálogo público).

Al agregar CRUDs nuevos, seguir el mismo patrón.

**OneClick — promociones de menú:** ver [PROMOCIONES.md](./PROMOCIONES.md) (schema, menú dinámico, listado con filtros, badges, admin).

**OneClick — banners de home:** ver [BANNERS.md](./BANNERS.md) (ubicaciones hero/secundario/triple/pie, HTML + imagen, admin, seed).

**OneClick — regalos por monto:** ver [REGALOS.md](./REGALOS.md) (regla por umbral, selector checkout, línea $0 en venta/Odoo, admin).

---

## 3. Mapa de carpetas relevantes

```
src/
  app/
    (shop)/              # Sitio público (header/footer)
      page.tsx           # Home
      catalogo/          # Listado + detalle
      carrito/           # Carrito (cookie)
      checkout/          # Gate Google/invitado + form + confirmación
      cuenta/            # Login / cuenta
      contacto/
    admin/               # Panel (layout propio)
      actions.ts         # Mutaciones admin (productos, etc.)
      ventas/            # Listado + detalle
      productos/         # listado, nuevo/, [id]/
      categorias/        # listado, [id]/
      caracteristicas/   # listado, [id]/
      almacenes/
      usuarios/          # listado, nuevo/, [id]/ (mail, tipo, activo)
      login/
    api/
      auth/[...nextauth]/
      uploads/[...path]/ # Sirve archivos de UPLOADS_DIR
  auth.ts                # NextAuth + Google (shop + admin) + dev-bypass
  proxy.ts               # Guard de /admin/*
  lib/
    prisma.ts
    cart.ts              # Cookie carrito, resolve, deductStock
    products.ts          # Queries catálogo + filtros de características
    uploads.ts
    auth-guard.ts
    utils.ts             # precio, WhatsApp, URLs de imagen
  components/
    site-chrome.tsx
    checkout-delivery-fields.tsx
    product-card.tsx
prisma/
  schema.prisma
  seed.ts
  migrations/
uploads/                 # No versionar contenido (solo .gitkeep)
```

---

## 4. Modelo de datos (resumen)

Relaciones clave:

- `producto` ↔ `categoria` vía `categoria_producto`
- `producto` ↔ `archivo` vía `archivo_producto` (`archivo.link` = path relativo en `uploads/`)
- Precio vigente: en `precio_producto`, la fila con mayor `fecha_desde` ≤ hoy
- Stock: PK compuesta `(id_producto, id_almacen)`
- Características de categoría: `caracteristica_categoria`
- Valores por producto: `producto_caracteristica` (`valor_numerico` + `valor` string)
- Auth: `usuario` mínimo (`mail`, `tipo_usuario`, `activo`)
- Comercio: `cliente` → `venta` → `venta_detalle` / `pago` / `envio` → `direccion`
- Admin: `usuario.tipo_usuario = 'admin'` y `activo = true`

Detalle Etapa 2: [ETAPA-2-CARRITO.md](./ETAPA-2-CARRITO.md) y [DER.txt](../DER.txt).

Cambios de esquema:

```bash
npx prisma migrate dev --name descripcion_cambio
```

En producción Hostinger: `npm run db:deploy`.

---

## 5. Variables de entorno

Ver `.env.example`.

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | MariaDB. **Local:** `localhost`. **Hostinger:** preferir `127.0.0.1` (no `localhost`) y el nombre completo de la DB del panel. |
| `AUTH_SECRET` | Sesiones Auth.js |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth Google |
| `AUTH_URL` | URL canónica (local o dominio) |
| `AUTH_DEV_BYPASS` | `true` solo local; **ignorado si `NODE_ENV=production`** |
| `SEED_ADMIN_EMAIL` | Mail del admin del seed / bypass |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | Número wa.me |
| `UPLOADS_DIR` | Carpeta de imágenes (default `uploads`) |

---

## 6. Cómo hacer cambios frecuentes

### 6.1 Nuevo campo en producto

1. Actualizar `prisma/schema.prisma` + migración.
2. Incluir el campo en formularios `productos/nuevo` y `productos/[id]`.
3. Extender `createProducto` / `updateProducto` en `actions.ts`.
4. Si debe verse en catálogo: `lib/products.ts` + páginas `(shop)/catalogo`.

### 6.2 Nuevo filtro en catálogo

La lógica vive en `src/lib/products.ts`:

- `getCategoryFilterDefinitions` — arma filtros según características de la categoría
- `parseCharacteristicFilters` — lee query params `c{id}`, `c{id}_min`, `c{id}_max`
- `getActiveProducts` — aplica filtros cualitativos (Prisma) y numéricos (post-filtro)

UI: `src/app/(shop)/catalogo/page.tsx`.

### 6.3 Nueva sección admin

1. Página listado bajo `src/app/admin/...`
2. Mutaciones en `actions.ts` con `await requireAdmin()` (vía `guard()`)
3. Link en `src/app/admin/layout.tsx`
4. Si es ruta sensible, ya está cubierta por `proxy.ts` (`/admin/:path*` excepto login)

### 6.4 Cambiar diseño

- Punto de entrada: `src/app/globals.css` (variables `--color-*`, `--font-*`)
- Layout público: `src/components/site-chrome.tsx` + `(shop)/layout.tsx`
- Preferir no acoplar lógica de negocio a clases CSS nuevas

### 6.5 Carrito y checkout (implementado — Etapa 2)

Documentación completa: [ETAPA-2-CARRITO.md](./ETAPA-2-CARRITO.md).

Resumen:

1. Cookie `cart` + `src/lib/cart.ts`; actions en `(shop)/carrito/actions.ts`.
2. Checkout invitado o Google; `confirmarVenta` en transacción Prisma.
3. Stock descontado al confirmar; WhatsApp solo si no hay stock/precio.
4. Admin `/admin/ventas` con filtros de fecha, entrega y estado.

---

## 7. Auth — comportamiento esperado

```
Login Google (shop o admin)
  → signIn permite cualquier mail Google válido
  → se asegura usuario (+ cliente si es nuevo)
  → JWT guarda userId + role
  → proxy bloquea /admin/* si role !== admin

AUTH_DEV_BYPASS=true (y no production)
  → provider credentials "dev-bypass"
  → botón "Entrar en modo desarrollo" en /admin/login
  → usa SEED_ADMIN_EMAIL o primer admin activo
```

**Nunca** dejar `AUTH_DEV_BYPASS=true` en Hostinger/producción.

Para agregar un admin nuevo: crear/editar usuario en `/admin/usuarios` con `tipo_usuario=admin` y el mismo mail de Google.

---

## 8. Imágenes

- Subida: `saveUploadedFile` en `lib/uploads.ts` desde acción `uploadProductoImagen`
- Registro: tablas `archivo` + `archivo_producto` (`archivo.link` = path relativo, ej. `productos/uuid.jpg`)
- URL pública: `uploadPublicUrl()` → por defecto `/api/uploads/{link}` en el **mismo dominio** (`https://aukanairelibre.com/api/uploads/...`)
- Variable opcional: `NEXT_PUBLIC_UPLOADS_BASE_URL` (default `/api/uploads`)
- En Hostinger: carpeta `uploads/` debe ser **persistente** entre deploys
- **No usar** URLs del File Manager (`*.hstgr.io/.../files/...`): no son públicas para el catálogo

Para probar: abrir `https://aukanairelibre.com/api/uploads/productos/<archivo>` en una ventana de incógnito.

---

## 9. Seed y datos de prueba

```bash
npm run db:seed
```

Recrea almacenes, categorías (pesca/camping), ~25 productos, precios, stock, características y usuarios.  
Admin: `SEED_ADMIN_EMAIL`.

**Cuidado:** el seed borra datos de las tablas de negocio antes de insertar.

---

## 10. Checklist antes de desplegar a Hostinger

- [ ] `AUTH_DEV_BYPASS` ausente o `false`
- [ ] Google OAuth con redirect `https://dominio/api/auth/callback/google`
- [ ] `AUTH_URL` = dominio de producción
- [ ] `DATABASE_URL` con host **`127.0.0.1`** (en Hostinger evitar `localhost`), usuario/password/DB del panel
- [ ] El build no consulta la DB (layouts con `force-dynamic`); la app sí la necesita al correr
- [ ] `npx prisma migrate deploy`
- [ ] Carpeta `uploads` con permisos de escritura
- [ ] `NEXT_PUBLIC_WHATSAPP_PHONE` real
- [ ] Al menos un `usuario` admin activo con el mail Google del dueño
- [ ] Start: `npm start` (respeta `PORT` de Hostinger)

---

## 11. Backlog sugerido (priorizado)

### Corto plazo

1. CSS / branding definitivo
2. Validación de formularios con mensajes de error visibles (hoy varios `throw` crudos)
3. Confirmación UI antes de eliminar (categorías, etc.)
4. Optimizar imágenes (límites de tamaño, thumbnails)
5. No permitir eliminar categoría con productos/subcategorías (misma regla que almacenes)
6. Cambiar estado de ventas desde el admin

### Etapa 3 — pagos y postventa

1. Integración MercadoPago (`pago.transaction_id` / `estado`)
2. Tarifas de envío reales + tracking
3. Historial de pedidos en `/cuenta`
4. Mails transaccionales
5. Cupones (si aplica)

### Operación

1. Backup de MariaDB + `uploads/`
2. Monitoreo de errores (Sentry u similar)
3. CI en GitHub (lint + `tsc` + build)

---

## 12. Comandos útiles

```bash
npm run dev          # local
npm run build        # producción
npm run db:migrate   # nueva migración (dev)
npm run db:deploy    # aplicar migraciones (prod)
npm run db:seed      # datos de prueba
npx tsc --noEmit     # chequeo de tipos
```

---

## 13. Contactos / referencias del negocio

- Mail público: `aukanairelibre@gmail.com`
- Repo: privado en GitHub (`web-aukan`)
- Requisitos originales: `Requetimientos.txt`
- DER: `DER.txt`
- Etapa 2: [ETAPA-2-CARRITO.md](./ETAPA-2-CARRITO.md)

---

*Última actualización: julio 2026 — etapa 2 operativa (carrito + checkout + ventas admin). Ver [ETAPA-2-CARRITO.md](./ETAPA-2-CARRITO.md). Integración checkout → Odoo: [ODOO-CHECKOUT.md](./ODOO-CHECKOUT.md).*
