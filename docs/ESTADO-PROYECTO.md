# OneClick Store — Estado del proyecto

Documento de handoff para continuar el clon de [oneclickstore.com](https://www.oneclickstore.com/) sobre la base Next.js (ex Aukan Aire Libre).

**Última actualización:** 2026-07-18  
**App:** `web/` (`web-oneclick` · Next.js 16 · React 19 · Prisma 6 · MariaDB)  
**Sitio de referencia:** https://www.oneclickstore.com/ (WooCommerce / WoodMart)  
**Mapa de rutas live:** [`Mapa.txt`](Mapa.txt) (~872 rutas)

---

## 1. Objetivo y decisiones cerradas

| Tema | Decisión |
|------|----------|
| Base | Reusar proyecto Aukan; no partir de cero |
| DB | MariaDB nueva: **`oneclickstore`** (schema Aukan + tablas OneClick) |
| Catálogo | Sync desde Odoo (`x_studio_publicado_web = true`) |
| Precios | `sk.product.price.by.company` con **`company_id = 1`** (no `list_price`) |
| CMS institucional | Páginas **estáticas React**; solo banners dinámicos vía tabla `banner` |
| Almacenes | `almacen` se mantiene; FK opcional `id_tienda` |
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
| `ODOO_URL` | ej. `https://oneclick.adhoc.ar` |
| `ODOO_DB` | ej. `odoo` |
| `ODOO_UID` | usuario API |
| `ODOO_API_KEY` / password | auth JSON-RPC |
| `NEXTAUTH_*` | auth admin / cuenta |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | wa.me flotante y CTAs |
| `NEXT_PUBLIC_UPLOADS_BASE_URL` | opcional; URLs públicas de imágenes |

---

## 4. Base de datos (Prisma)

Schema: [`web/prisma/schema.prisma`](web/prisma/schema.prisma)  
Seed: [`web/prisma/seed.ts`](web/prisma/seed.ts)

### Tablas heredadas (Aukan)
`producto`, `categoria`, `almacen`, `stock`, `precio_producto`, `archivo`, `caracteristica`, `usuario`, `cliente`, `venta`, etc.

### Extensiones OneClick
- Producto/categoría: `slug`, `odoo_id`; producto: `id_marca`, `cuotas_max`
- `almacen.id_tienda`
- Nuevas: `marca`, `etiqueta` + `etiqueta_producto`, `familia`, `grupo_producto` + items, `beneficio` + `tarjeta_adherida` + M2M, `banner` (con `vigencia_desde` / `vigencia_hasta`), `tienda`, `lista_deseos` + items

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
    products.ts      # queries listado / categoría por path
    pricing.ts       # contado −10%, sin impuestos /1.105
    nav.ts           # mega-menú hardcodeado como live
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

### Redirects útiles
`/mi-cuenta` → `/cuenta`, `/finalizar-compra` → `/checkout`, `/catalogo` → `/shop`

---

## 7. Home — orden de secciones (estado actual)

Archivo: [`web/src/app/(shop)/page.tsx`](web/src/app/(shop)/page.tsx)  
Estilos: [`web/src/app/globals.css`](web/src/app/globals.css) (clases `.oc-*`)

| # | Sección | Notas / assets |
|---|---------|----------------|
| 1 | **Hero** | Copy izquierda + Mac (`/oneclick/hero-mac.jpg`); no usar screenshot live con texto horneado |
| 2 | Barra utilidad oscura | Bajo el hero |
| 3 | Strip Mundial | Dentro de `.container` (no full-bleed) |
| 4 | **Destacados** | Título izq. + selector Apple/JBL/Accesorios centrado (`grid 1fr auto 1fr`) |
| 5 | **3 promo cards** | Antes de JBL. Altura fija ~**200px**. Imágenes en `public/oneclick/promos/` |
| 6 | **¡Llevá la fiesta…!** | Productos marca JBL |
| 7 | **Trío categorías** | Audio / Mochilas / Fundas → `public/oneclick/banners/*-full.jpg` |
| 8 | **Potenciá tu iPhone** | Fundas cat. `accesorios-fundas-y-cobertores` filtradas `q: "iPhone 17"` (take 6) + botón `+` |

### Promo cards (detalle)
1. Negro: iPhone + Mophie → `media-iphone-mophie.webp`, `mophie-logo.png`  
2. Blanco: asesores → `media-experiencia.webp` + CTA WhatsApp  
3. Blanco: servicio → `media-servicio.webp`  

Clases: `.oc-promo-grid`, `.oc-promo-card`, `.oc-btn-red`

### Trío banners
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

- CRUD: productos, categorías, características, marcas, banners (vigencia), tiendas, beneficios, usuarios, ventas  
- Sync Odoo desde UI  
- Login NextAuth

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
5. Nav hardcodeada en `nav.ts` (no solo DB) para pegar al menú live.  
6. Scrapes Playwright al live a veces timeoutean en `networkidle`; preferir `domcontentloaded` + scroll.  
7. WhatsApp: teléfono por env; default placeholder si falta.

---

## 12. Pendiente / próximos cambios (sugerido)

- [ ] Sync completo con imágenes + stock y revisar cards “Potenciá” / Destacados  
- [ ] Afinar home vs live (hero, tipografías, espaciados)  
- [ ] Resto de bloques home si el live agrega más secciones bajo “Potenciá” (ej. protección Zagg / banner iPhone 17)  
- [ ] Checkout / cuenta / wishlist a nivel producción  
- [ ] Banners gestionables desde admin en lugar de paths hardcodeados en `page.tsx`  
- [ ] Tests visuales (`compare-home.mjs`) en CI opcional  
- [ ] Deploy + DNS / env prod

---

## 13. Dónde tocar según el pedido

| Pedido típico | Archivos |
|---------------|----------|
| Cambiar home / secciones | `src/app/(shop)/page.tsx`, `globals.css` |
| Promo cards / banners | `page.tsx` + `public/oneclick/promos|banners/` |
| Precios / cuotas / contado | `src/lib/pricing.ts`, `product-card.tsx` |
| Menú | `src/lib/nav.ts`, `site-chrome.tsx` |
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
