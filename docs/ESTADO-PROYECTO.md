# OneClick Store — Estado del proyecto

Documento de handoff para continuar el clon de [oneclickstore.com](https://www.oneclickstore.com/) sobre la base Next.js (ex Aukan Aire Libre).

**Última actualización:** 2026-07-28  
**App:** `web/` (`web-oneclick` · Next.js 16 · React 19 · Prisma 6 · MariaDB)  
**Sitio de referencia:** https://www.oneclickstore.com/ (WooCommerce / WoodMart)  
**Mapa de rutas live:** [`Mapa.txt`](Mapa.txt) (~872 rutas)  
**Checkout → Odoo (detalle):** [**ODOO-CHECKOUT.md**](./ODOO-CHECKOUT.md)

---

## 1. Objetivo y decisiones cerradas

| Tema | Decisión |
|------|----------|
| Base | Reusar proyecto Aukan; no partir de cero |
| DB | MariaDB nueva: **`oneclickstore`** (schema Aukan + tablas OneClick) |
| Catálogo | Sync desde Odoo (`x_studio_publicado_web = true`) |
| Precios | `sk.product.price.by.company` con **`company_id = 1`** (no `list_price`) |
| CMS institucional | Páginas **estáticas React**; solo banners dinámicos vía tabla `banner` |
| Almacenes | `almacen`: FK opcional `id_tienda` (retiro) y `es_envio_domicilio` (envío WH) |
| Rutas | Implicar URLs Woo ES (`/producto/`, `/marca/`, `/etiqueta/`, catch-all categorías) |

---

## 2. Cómo arrancar

```bash
cd web
npm install
# .env con DATABASE_URL + Odoo (ver §3)
npx prisma db push
npm run db:seed
npm run sync:odoo          # opcional: -- --skip-images --skip-stock (más rápido)
npm run dev                # webpack + heap 8GB (evitar Turbopack en esta máquina)
```

- Local: http://localhost:3000  
- Preferir `npm run dev` (webpack). `dev:turbo` puede OOM en `/`.

---

## 3. Variables de entorno (`web/.env`)

No commitear secretos. Lo esperado:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | `mysql://user:pass@localhost:3306/oneclickstore` |
| `ODOO_URL` | ej. `https://oneclick.adhoc.ar` o training Adhoc |
| `ODOO_DB` | ej. `odoo` |
| `ODOO_UID` | id numérico de `res.users` |
| `ODOO_API_KEY` | clave API del usuario (no la contraseña de login) |
| `NEXTAUTH_*` / `AUTH_*` | auth admin / cuenta |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | wa.me flotante y CTAs |
| `NEXT_PUBLIC_UPLOADS_BASE_URL` | opcional; URLs públicas de imágenes |
| `MERCADOPAGO_*` / `NEXT_PUBLIC_MERCADOPAGO_*` | cobro (ver checkout) |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | GA4 (opcional) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (opcional) |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | Google Ads conversion ID sin `AW-` (opcional) |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | Etiqueta conversión Purchase (opcional) |

Analytics (GA4 / Meta Pixel / Google Ads) se cargan solo en `(shop)` vía `AnalyticsProvider`. Sin IDs en env no se inyectan scripts. Purchase + conversión Ads solo en `/checkout/confirmacion/[id]` con pago aprobado (dedupe `sessionStorage` por `id_venta`).

**Verificación manual:** DevTools Network (`collect`, `fbevents`); Meta Pixel Helper / Tag Assistant; flujo PDP → cart → checkout → confirmación OK (una sola Purchase); fallo MP sin Purchase; `/admin` sin scripts marketing.

IDs de journals / tipo pedido / producto envío, etc.: **tabla `parametro` grupo `odoo`** (no van en `.env`). Ver [ODOO-CHECKOUT.md](./ODOO-CHECKOUT.md).

---

## 4. Base de datos (Prisma)

Schema: [`web/prisma/schema.prisma`](web/prisma/schema.prisma)  
Seed: [`web/prisma/seed.ts`](web/prisma/seed.ts)

### Tablas heredadas (Aukan)
`producto`, `categoria`, `almacen`, `stock`, `precio_producto`, `archivo`, `caracteristica`, `usuario`, `cliente`, `venta`, etc.

### Extensiones OneClick
- Producto/categoría: `slug`, `odoo_id`; producto: `id_marca`, `cuotas_max`
- `almacen.id_tienda` (sucursal de retiro)
- `almacen.es_envio_domicilio` (almacén de envío a domicilio, ej. WH)
- Nuevas: `marca`, `etiqueta` + `etiqueta_producto`, `familia`, `grupo_producto` + items, `beneficio` + `tarjeta_adherida` + M2M, `banner` (vigencia + `html` + `clase_css`; ver [BANNERS.md](./BANNERS.md)), `tienda`, `lista_deseos` + items
- **Promociones de menú:** `promocion` + `promocion_categoria` + `promocion_producto` (ver [PROMOCIONES.md](./PROMOCIONES.md))

---

## 5. Sync Odoo

| Archivo | Rol |
|---------|-----|
| [`web/src/lib/odoo.ts`](web/src/lib/odoo.ts) | Cliente JSON-RPC |
| [`web/src/lib/odoo-sync.ts`](web/src/lib/odoo-sync.ts) | Sync categorías → almacenes → marcas → etiquetas → productos → precios → stock |
| [`web/scripts/sync-odoo.ts`](web/scripts/sync-odoo.ts) | CLI `npm run sync:odoo` |
| [`web/scripts/inspect-odoo.ts`](web/scripts/inspect-odoo.ts) | Inspección de modelos |
| Admin | Botón + `POST /api/admin/sync-odoo` (import dinámico) |

**Filtro productos:** `x_studio_publicado_web = true` (~776 en último sync).

**Precios:** upsert raw SQL por rarezas de DATE en MySQL.

**Flags útiles:** `--skip-images`, `--skip-stock` (cards pueden quedar sin foto hasta sync completo).

### 5.1 Checkout → Odoo (ventas)

**Doc completa:** [**ODOO-CHECKOUT.md**](./ODOO-CHECKOUT.md) (flujo, parámetros, almacenes, idempotencia, pruebas, troubleshooting).

Resumen: al aprobarse Mercado Pago → `applyMercadoPagoPayment` → `syncVentaToOdoo`:

| Paso | Modelo Odoo | Detalle |
|------|-------------|---------|
| Stock | `stock.quant` | Almacén envío (`es_envio_domicilio`) o almacén de tienda (retiro) |
| Cliente | `res.partner` | Datos AFIP + dirección |
| Orden | `sale.order` | Tipo Ecommerce, nombre `OCWN-<id_venta>` |
| Recibo | `account.payment` | `memo` = nº operación MP |

Credenciales en `.env`; IDs en `parametro` grupo `odoo`.

```bash
npm run seed:odoo-params          # defaults de parámetros Odoo
npm run test:checkout-odoo        # retiro, sin MP
npm run test:checkout-odoo -- --envio
npm run sync:ventas               # reintentos pendientes
```

Reintento admin: `POST /api/admin/odoo/sync-venta`.

---

## 6. Front — arquitectura

```
web/src/
  app/
    (shop)/          # tienda pública
      page.tsx       # HOME
      [...path]/    # categorías Woo-style
      producto/[slug]/ marca|etiqueta|familia|group|...
      shop|carrito|checkout|lista-deseos|tiendas|...
      *institucionales* (nosotros, faqs, servicio-tecnico, …)
    admin/           # CRUD + sync
  components/        # site-chrome, product-card, …
  lib/
    products.ts      # queries listado / categoría por path / facetas shop
    promos.ts        # promociones de menú (nav, slug, badges)
    pricing.ts       # contado −10%, sin impuestos /1.105
    nav.ts           # mega-menú (Promociones = dynamicChildren desde DB)
    odoo*.ts
  app/globals.css    # tokens OneClick + layout home (prefijo .oc-*)
```

### Precios en UI ([`pricing.ts`](web/src/lib/pricing.ts))
- Contado: lista × **0.9**
- Sin impuestos nacionales: lista ÷ **1.105**
- Cuotas: campo `cuotas_max` del producto

### Categorías por URL ([`getCategoryBySlugPath`](web/src/lib/products.ts))
1. Match jerárquico por segmentos  
2. Fallback: último segmento  
3. Fallback: `slugs.join("-")` (ej. `/accesorios/fundas-y-cobertores` → `accesorios-fundas-y-cobertores`)

### Promociones de menú
Doc completa: [**PROMOCIONES.md**](./PROMOCIONES.md). Resumen: tabla `promocion` alimenta el submenu; `/{slug}` lista productos con filtros tipo shop; badge opcional en cards; CRUD en `/admin/promociones`.

### Redirects útiles
`/mi-cuenta` → `/cuenta`, `/finalizar-compra` → `/checkout`, `/catalogo` → `/shop`

---

## 7. Home — orden de secciones (estado actual)

Archivo: [`web/src/app/(shop)/page.tsx`](web/src/app/(shop)/page.tsx)  
Estilos: [`web/src/app/globals.css`](web/src/app/globals.css) (clases `.oc-*`)  
**Banners administrables (detalle):** [BANNERS.md](./BANNERS.md)

| # | Sección | Notas / assets |
|---|---------|----------------|
| 1 | **Hero** | Desde DB (`ubicacion=hero`). Render: `HomeHeroBanner`. Seed: `/oneclick/hero-mac.jpg` + HTML `.oc-hero-live-copy` |
| 2 | Barra utilidad oscura | Hardcode en `page.tsx` |
| 3 | Strip secundario (Mundial) | Desde DB (`ubicacion=secundario`). Render: `HomeSecundarioBanner` |
| 4 | **Destacados** | Título izq. + selector Apple/JBL/Accesorios centrado (`grid 1fr auto 1fr`) |
| 5 | **Triple promo cards** | Desde DB (`ubicacion=triple`, orden 1–3). Render: `HomeTripleBanners`. Clases `oc-promo-dark` / `oc-promo-light` |
| 6 | **¡Llevá la fiesta…!** | Productos marca JBL |
| 7 | **Trío categorías** | Audio / Mochilas / Fundas → aún hardcode + `public/oneclick/banners/*-full.jpg` |
| 8 | **Potenciá tu iPhone** | Fundas cat. `accesorios-fundas-y-cobertores` filtradas `q: "iPhone 17"` (take 6) + botón `+` |
| 9 | **Banner pie (ZAGG)** | Desde DB (`ubicacion=pie`). Render: `HomePieBanner` |

### Triple cards (seed)
1. Negro: iPhone + Mophie → `media-iphone-mophie.webp`, `mophie-logo.png`  
2. Blanco: asesores → `media-experiencia.webp` + CTA WhatsApp  
3. Blanco: servicio → `media-servicio.webp`  

Clases: `.oc-promo-grid`, `.oc-promo-card`, `.oc-btn-red` — el HTML vive en `banner.html`.

### Trío categorías (aún estático)
Clases: `.oc-category-banner-grid`, `.oc-category-banner`  
Links: `/audio`, `/accesorios/bolsos-y-mochilas`, `/accesorios/fundas-y-cobertores`

---

## 8. Assets públicos

```
web/public/oneclick/
  logo.svg
  hero-mac.jpg
  scraped/          # dumps del crawl inicial
  promos/           # cards Mophie / experiencia / servicio
  banners/          # audio|mochilas|fundas (-full.jpg y .webp)
```

Scripts de apoyo (Playwright / sharp):  
`scripts/download-assets.mjs`, `download-live-assets.mjs`, `download-promo-cards.mjs`, `capture-promo-*.mjs`, `compare-home.mjs`

---

## 9. Admin

- CRUD: productos, categorías, características, marcas, **banners** (home: hero/secundario/triple/pie), tiendas, **promociones** (menú), **regalos** (umbral + SKUs), beneficios, usuarios, ventas  
- Sync Odoo desde UI  
- Login NextAuth
- Promociones: listado + `/nuevo` + `/[id]` — detalle en [PROMOCIONES.md](./PROMOCIONES.md)
- Banners: listado + `/nuevo` + `/[id]` — detalle en [BANNERS.md](./BANNERS.md)

---

## 10. Scripts npm

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Dev webpack + 8GB heap |
| `npm run build` / `start` | Producción |
| `npm run db:push` / `db:seed` | Schema + datos iniciales |
| `npm run sync:odoo` | Catálogo desde Odoo |
| `npm run assets:download` | Assets estáticos |

---

## 11. Problemas conocidos / cuidados

1. **Imágenes de producto** suelen faltar si el sync se corrió con `--skip-images` → placeholders en cards.  
2. **Turbopack** en esta máquina: OOM en home; usar webpack.  
3. Listados de producto: query **liviana** (sin `descripcion` HTML completa) para memoria.  
4. Precios Odoo: upsert con `$executeRaw` por DATE.  
5. Nav: Mac/iPhone/… hardcodeados en `nav.ts`; **Promociones** dinámicas desde DB (`dynamicChildren`) — ver [PROMOCIONES.md](./PROMOCIONES.md).  
6. Scrapes Playwright al live a veces timeoutean en `networkidle`; preferir `domcontentloaded` + scroll.  
7. WhatsApp: teléfono por env; default placeholder si falta.

---

## 12. Pendiente / próximos cambios (sugerido)

- [ ] Sync completo con imágenes + stock y revisar cards “Potenciá” / Destacados  
- [ ] Afinar home vs live (tipografías, espaciados; copy de banners desde admin)  
- [ ] Gestionar también el trío Audio/Mochilas/Fundas desde admin (hoy hardcode)  
- [ ] Checkout / cuenta / wishlist a nivel producción  
- [x] Banners hero / secundario / triple / pie gestionables desde admin ([BANNERS.md](./BANNERS.md))  
- [ ] Tests visuales (`compare-home.mjs`) en CI opcional  
- [ ] Deploy + DNS / env prod

---

## 13. Dónde tocar según el pedido

| Pedido típico | Archivos |
|---------------|----------|
| Cambiar home / secciones | `src/app/(shop)/page.tsx`, `globals.css` |
| **Banners home (hero/secundario/triple/pie)** | Ver [BANNERS.md](./BANNERS.md) — `home-banners.tsx`, `admin/banners`, `lib/banners.ts` |
| Trío categorías Audio/Mochilas/Fundas | `page.tsx` + `public/oneclick/banners/` (aún estático) |
| **Promociones del menú** | Ver [PROMOCIONES.md](./PROMOCIONES.md) — `promos.ts`, `site-chrome`, `admin/promociones`, catch-all |
| **Regalos por monto** | Ver [REGALOS.md](./REGALOS.md) — checkout selector, línea $0 Odoo, `admin/regalos` |
| Precios / cuotas / contado | `src/lib/pricing.ts`, `product-card.tsx` |
| Menú (resto de categorías) | `src/lib/nav.ts`, `site-chrome.tsx` |
| Listados / categorías | `src/lib/products.ts`, `(shop)/[...path]/page.tsx` |
| Sync / Odoo | `src/lib/odoo-sync.ts`, `scripts/sync-odoo.ts` |
| Schema / tablas | `prisma/schema.prisma`, `prisma/seed.ts` |
| Mapa de URLs live | `Mapa.txt` (raíz repo) |

---

## 14. Referencia rápida de diseño (tokens)

En `globals.css` (aprox.):

- Rojo CTA: `--oc-red: #e3002b`  
- Fondo soft: `#f5f5f7`  
- Botones pill: `border-radius: 999px` / `.oc-btn-red`  
- Cards producto: `.oc-product-card` + grid `.oc-product-grid` (4 cols; `.oc-product-grid-6` para Potenciá)

---

*Mantener este archivo actualizado cuando se cierren bloques grandes (home, sync, checkout, deploy).*
