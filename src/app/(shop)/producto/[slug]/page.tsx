import { notFound } from "next/navigation";
import Link from "next/link";
import styles from "./product-redesign.module.css";
import { ProductAddToCart } from "@/components/product-add-to-cart";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductReserveForm } from "@/components/product-reserve-form";
import { ProductStoreAvailability } from "@/components/product-store-availability";
import { ProductVariantPicker } from "@/components/product-variant-picker";
import {
  effectiveCharacteristicRows,
  getActiveProducts,
  getProductBySlug,
  getProductVariants,
  getSizeComparison,
  pickConsistentDescription,
  resolveStoreAvailability,
  sortProductImageLinks,
} from "@/lib/products";
import { formatPriceArs, precioSinImpuestos } from "@/lib/pricing";
import { whatsappUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

function DeliveryBlock() {
  return (
    <div className="oc-pdp-delivery">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="oc-pdp-delivery-icon"
        src="/delivery-24hs.svg"
        alt=""
        width={40}
        height={40}
        aria-hidden
      />
      <div className="oc-pdp-delivery-text">
        <strong>Entrega dentro de las 24hs en AMBA</strong>
        <p>Recibilo en 24hs comprando antes de las 12hs</p>
      </div>
    </div>
  );
}

function WishlistLink() {
  return (
    <Link href="/lista-deseos" className="oc-pdp-wishlist">
      <span className="oc-pdp-wishlist-icon" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20.5s-7.5-4.6-9.8-9.2C.6 7.8 2.3 4.5 5.7 4c2-.3 4 .6 5.1 2.3l1.2 1.8 1.2-1.8C14.3 4.6 16.3 3.7 18.3 4c3.4.5 5.1 3.8 3.5 7.3-2.3 4.6-9.8 9.2-9.8 9.2z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      Añadir a lista de deseos
    </Link>
  );
}

function findCaracteristica(
  caracteristicas: { caracteristica: { nombre: string }; valor: string }[],
  nombre: string
): string | null {
  return caracteristicas.find((c) => c.caracteristica.nombre === nombre)?.valor ?? null;
}

// Términos que no deben pasar por minúscula al normalizar los bullets de marketing
// (vienen en MAYÚSCULA en la descripción de Odoo, ej. "CON EL CHIP M5 —").
const CASE_FIXUPS: Record<string, string> = {
  IA: "IA",
  M4: "M4",
  M5: "M5",
  PRO: "Pro",
  MAX: "Max",
  IPHONE: "iPhone",
  MAC: "Mac",
  MACBOOK: "MacBook",
  APPLE: "Apple",
  LLM: "LLM",
  GPU: "GPU",
  CPU: "CPU",
  SSD: "SSD",
  FACETIME: "FaceTime",
  ADOBE: "Adobe",
  MICROSOFT: "Microsoft",
  FILEVAULT: "FileVault",
  THUNDERBOLT: "Thunderbolt",
  MAGSAFE: "MagSafe",
  HDMI: "HDMI",
  SDXC: "SDXC",
  RETINA: "Retina",
  XDR: "XDR",
  DOLBY: "Dolby",
  ATMOS: "Atmos",
};

function toSentenceCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      const key = w.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, "");
      if (key && CASE_FIXUPS[key]) {
        return w.replace(new RegExp(key, "i"), CASE_FIXUPS[key]);
      }
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    })
    .join(" ");
}

type Highlight = { title: string; body: string };

/**
 * Parsea los bullets "• TÍTULO — texto" que Odoo trae en algunas descripciones
 * (ej. "CON LOS SUPERPODERES DEL CHIP M5 — ..."). Si el texto no tiene ese
 * formato, devuelve null y se usa la descripción tal cual (no se inventa nada).
 */
function parseHighlights(
  html: string,
  productTitulo: string,
  modeloBase: string | null
): Highlight[] | null {
  const text = html
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    // notas al pie pegadas después de un punto, ej. "batería.1" o "Apple.2"
    // (solo si el punto va después de una letra, para no romper decimales como "14.2")
    .replace(/(\p{L})\.(\d+)\b/gu, "$1.")
    .replace(/\s+/g, " ")
    .trim();

  if (!text.includes("•")) return null;

  const tituloNormalizado = productTitulo.replace(/\s+/g, " ").trim();

  const highlights: Highlight[] = [];
  for (const raw of text.split("•")) {
    // Solo pisa dígitos de nota al pie pegados a palabras largas (ej. "batería2"),
    // nunca a códigos cortos reales como "M5", "M4", "TB5".
    const part = raw.replace(/(\p{L}{3,})\d+\b/gu, "$1").trim();
    if (!part) continue;
    const match = part.match(/^([A-ZÁÉÍÓÚÑ0-9,¡!¿?'" ]{4,})\s*[—–-]\s*(.+)$/);
    if (!match) continue;
    const title = toSentenceCase(match[1].trim());
    let body = match[2].trim();

    // Odoo repite a veces el título del producto (a menudo con datos ligeramente
    // distintos al título real, ej. color traducido distinto) y agrega "Aviso legal"
    // al final del último bullet; cortamos ahí para no arrastrar ese texto ajeno.
    const modeloRegex = modeloBase
      ? new RegExp(`\\b${modeloBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+\\d`)
      : null;
    const cutPoints = [
      tituloNormalizado ? body.indexOf(tituloNormalizado) : -1,
      modeloRegex ? body.search(modeloRegex) : -1,
      body.search(/aviso(s)? legal/i),
    ].filter((i) => i > 0);
    if (cutPoints.length) {
      body = body.slice(0, Math.min(...cutPoints)).trim();
    }

    if (title && body) highlights.push({ title, body });
  }

  return highlights.length >= 2 ? highlights : null;
}

function SpecTilesGrid({
  caracteristicas,
}: {
  caracteristicas: { caracteristica: { nombre: string }; valor: string }[];
}) {
  const chip = findCaracteristica(caracteristicas, "Chip");
  const cpu = findCaracteristica(caracteristicas, "CPU");
  const gpu = findCaracteristica(caracteristicas, "GPU");
  const ram = findCaracteristica(caracteristicas, "RAM");
  const almacenamiento = findCaracteristica(caracteristicas, "Almacenamiento");
  const pantalla = findCaracteristica(caracteristicas, "Tamaño");
  const tipoPantalla = findCaracteristica(caracteristicas, "Tipo de pantalla");
  const bateria = findCaracteristica(caracteristicas, "Batería");

  if (!chip) return null;

  const tiles = [
    { value: chip, sub: [cpu, gpu].filter(Boolean).join(" · ") || null },
    ram || almacenamiento
      ? { value: [ram, almacenamiento].filter(Boolean).join(" · "), sub: "RAM · Almacenamiento" }
      : null,
    pantalla ? { value: pantalla, sub: tipoPantalla } : null,
    bateria ? { value: bateria, sub: "de autonomía" } : null,
  ].filter((t): t is { value: string; sub: string | null } => Boolean(t));

  if (!tiles.length) return null;

  return (
    <div className="oc-pdp-spec-tiles">
      {tiles.map((t, i) => (
        <div key={i} className="oc-pdp-spec-tile">
          <strong>{t.value}</strong>
          {t.sub && <span>{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Odoo repite a veces, dentro del HTML de descripción, una lista de
 * "Características" (<ul><li>MARCA - Apple</li>...) y encabezados que repiten
 * el título del producto. Esa info ya vive siempre en la tabla de
 * Características técnicas — nunca debe mostrarse también como texto suelto acá.
 */
function cleanFallbackHtml(html: string, modeloBase: string | null): string {
  let out = html.replace(
    /<(p|div)[^>]*>\s*<strong>\s*Caracter[ií]sticas\s*<\/strong>\s*<\/\1>\s*<ul>[\s\S]*?<\/ul>/gi,
    ""
  );

  if (modeloBase) {
    const modeloEsc = modeloBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(
        `<h[1-3][^>]*>(?:(?!</h[1-3]>)[\\s\\S])*?${modeloEsc}[\\s\\S]*?\\d[\\s\\S]*?</h[1-3]>`,
        "gi"
      ),
      ""
    );
  }

  return out;
}

function HighlightsSection({
  modeloBase,
  highlights,
  fallbackHtml,
}: {
  modeloBase: string | null;
  highlights: Highlight[] | null;
  fallbackHtml: string;
}) {
  return (
    <div className="oc-pdp-highlights-wrap">
      <h2>Por qué {modeloBase ? `esta ${modeloBase}` : "este producto"}.</h2>
      {highlights ? (
        <div className="oc-pdp-highlights-grid">
          {highlights.map((h, i) => (
            <div key={i} className="oc-pdp-highlight">
              <h4>{h.title}</h4>
              <p>{h.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="oc-pdp-highlights-fallback"
          dangerouslySetInnerHTML={{ __html: fallbackHtml }}
        />
      )}
    </div>
  );
}

function TechSpecsTable({
  caracteristicas,
}: {
  caracteristicas: { caracteristica: { nombre: string }; valor: string }[];
}) {
  if (!caracteristicas.length) return null;
  return (
    <div className="oc-pdp-techspecs-wrap">
      <h2>Características técnicas.</h2>
      <div className="oc-pdp-techspecs">
        {caracteristicas.map((c) => (
          <div key={c.caracteristica.nombre} className="oc-pdp-techspecs-row">
            <div>{c.caracteristica.nombre}</div>
            <div>{c.valor}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SizeComparisonTable({
  modeloBase,
  rows,
}: {
  modeloBase: string;
  rows: import("@/lib/products").SizeComparisonRow[];
}) {
  if (rows.length < 2) return null;
  const showPantalla = rows.every((r) => r.tipoPantalla);
  const gridTemplateColumns = `1.2fr repeat(${rows.length}, 1fr)`;

  return (
    <div className="oc-pdp-compare">
      <div className="oc-pdp-compare-row oc-pdp-compare-head" style={{ gridTemplateColumns }}>
        <div>Comparar</div>
        {rows.map((r) => (
          <div key={r.tamano}>
            {modeloBase} {r.tamano}
          </div>
        ))}
      </div>
      {showPantalla && (
        <div className="oc-pdp-compare-row" style={{ gridTemplateColumns }}>
          <div>Pantalla</div>
          {rows.map((r) => (
            <div key={r.tamano}>
              {r.tamano} · {r.tipoPantalla}
            </div>
          ))}
        </div>
      )}
      <div className="oc-pdp-compare-row" style={{ gridTemplateColumns }}>
        <div>Chips disponibles</div>
        {rows.map((r) => (
          <div key={r.tamano}>{r.chips}</div>
        ))}
      </div>
      <div className="oc-pdp-compare-row oc-pdp-compare-strong" style={{ gridTemplateColumns }}>
        <div>Desde</div>
        {rows.map((r) => (
          <div key={r.tamano}>{formatPriceArs(r.desde)}</div>
        ))}
      </div>
    </div>
  );
}

function BankPromoBlock({
  cuotas,
  cuotaMonto,
}: {
  cuotas: number;
  cuotaMonto: number | null;
}) {
  return (
    <div className="oc-pdp-bank">
      <h4>Promociones Bancarias</h4>
      <div className="oc-pdp-bank-row">
        <div className="oc-pdp-bank-info">
          <p className="oc-pdp-bank-title">{cuotas} cuotas sin interés</p>
          <p className="oc-pdp-bank-sub">
            Con todas las tarjetas y bancos
            {cuotaMonto != null ? ` - Cuotas de ${formatPriceArs(cuotaMonto)}` : null}
          </p>
        </div>
        <div className="oc-pdp-bank-pay">
          <ul className="oc-pdp-bank-cards" aria-label="Tarjetas">
            <li>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payment/mastercard.jpg" alt="Mastercard" width={56} height={36} />
            </li>
            <li>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payment/visa.jpg" alt="VISA" width={56} height={36} />
            </li>
          </ul>
          <div className="oc-pdp-bank-mp">
            <span>Pagando con:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/payment/mercadopago.png" alt="Mercado Pago" width={72} height={19} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ProductoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const imagenes = sortProductImageLinks(
    product.archivos.map((a) => ({
      link: a.archivo.link,
      tipo: a.archivo.tipo,
      id_archivo: a.archivo.id_archivo,
    }))
  );
  const cuotas = product.cuotas_max ?? 12;
  const sinImp = precioSinImpuestos(product.precio);
  const inStock = product.inStock;

  // Título corto ("Modelo Tamaño · Color") a partir de características reales —
  // cargadas en producto_caracteristica si existen, si no derivadas del propio
  // título/descripción (ver effectiveCharacteristicRows); si ninguna de las dos
  // da el dato, se usa el título completo tal como viene de Odoo (no se inventa nada).
  const modeloBase = product.categorias[0]?.categoria.nombre.split(" / ").pop() ?? null;
  const caracteristicasEfectivas = effectiveCharacteristicRows(product);
  const tamanoChar = findCaracteristica(caracteristicasEfectivas, "Tamaño");
  const colorChar = findCaracteristica(caracteristicasEfectivas, "Color");
  const displayTitle =
    modeloBase && tamanoChar && colorChar
      ? `${modeloBase} ${tamanoChar} · ${colorChar}`
      : product.titulo;

  const chipChar = findCaracteristica(caracteristicasEfectivas, "Chip");
  const pantallaTipoChar = findCaracteristica(caracteristicasEfectivas, "Tipo de pantalla");
  const bateriaChar = findCaracteristica(caracteristicasEfectivas, "Batería");
  const displaySubtitle =
    chipChar && pantallaTipoChar && bateriaChar
      ? `Chip ${chipChar}, pantalla ${pantallaTipoChar} y ${bateriaChar.toLowerCase()} de batería.`
      : null;
  const storeAvailability = resolveStoreAvailability(product.stocks);
  const cuotaMonto =
    product.precio != null && cuotas > 0 ? Number(product.precio) / cuotas : null;
  const waReserve = whatsappUrl(product.titulo, product.id_producto, "reserva");
  const variants = await getProductVariants(product);

  // Si la descripción propia contradice el Chip real (bug de contenido en Odoo,
  // ej. dice "chip M4" en un producto M5), se usa la de una variante hermana
  // consistente — mismo hardware, misma info, solo cambia el color.
  const descripcionConsistente = pickConsistentDescription(product, variants, chipChar);
  const highlights = parseHighlights(descripcionConsistente, product.titulo, modeloBase);
  const maxQty =
    product.stockTracked && product.stockTotal > 0
      ? Math.min(99, Math.floor(product.stockTotal))
      : 99;

  const categoryId = product.categorias[0]?.id_categoria;
  const related = categoryId
    ? (
        await getActiveProducts({
          categoriaId: categoryId,
          take: 8,
        })
      ).items.filter((p) => p.id_producto !== product.id_producto).slice(0, 8)
    : [];
  const sizeComparison = categoryId ? await getSizeComparison(categoryId) : [];
  const ownTamano = tamanoChar;

  return (
    <div className={`container oc-pdp ${styles.wrapper}`}>
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          {product.categorias[0] && (
            <>
              <Link href={`/${product.categorias[0].categoria.slug}`}>
                {product.categorias[0].categoria.nombre}
              </Link>
              <span>/</span>
            </>
          )}
          <span>{displayTitle}</span>
        </nav>
      </div>

      <div className="oc-product-detail">
        <div className="oc-pdp-gallery-wrap">
          <ProductGallery images={imagenes} alt={product.titulo} outOfStock={!inStock} />
          <div className="oc-pdp-reseller-badge">
            <span />
            Apple Premium Reseller
          </div>
        </div>

        <div className="oc-pdp-buybox">
          {product.marca && (
            <p className="oc-pdp-brand">
              <Link href={`/marca/${product.marca.slug}`}>{product.marca.nombre}</Link>
            </p>
          )}
          <h1>{displayTitle}</h1>
          {displaySubtitle && <p className="oc-pdp-subtitle">{displaySubtitle}</p>}

          <div className="oc-pdp-price-row">
            <p className="oc-price">{formatPriceArs(product.precio)}</p>
            {inStock && cuotaMonto != null && (
              <span className="oc-pdp-price-cuota">
                o {cuotas} cuotas de {formatPriceArs(cuotaMonto)}
              </span>
            )}
          </div>

          <div className="oc-pdp-divider" />

          {variants.length > 0 && (
            <ProductVariantPicker variants={variants} currentId={product.id_producto} />
          )}

          {sizeComparison.length > 1 && ownTamano && (
            <div className="oc-pdp-variant-group">
              <div className="oc-pdp-variant-heading">
                <span>Tamaño</span>
                <em>{ownTamano}</em>
              </div>
              <div className="oc-pdp-size-options">
                {sizeComparison.map((r) => (
                  <Link
                    key={r.tamano}
                    href={r.slugDesde ? `/producto/${r.slugDesde}` : "#"}
                    scroll={false}
                    className={`oc-pdp-size-tile${r.tamano === ownTamano ? " is-active" : ""}`}
                  >
                    <div className="oc-pdp-size-tile-n">{r.tamano}</div>
                    <div className="oc-pdp-size-tile-m">
                      {r.tipoPantalla ?? "Liquid Retina XDR"}
                    </div>
                    <div className="oc-pdp-size-tile-p">Desde {formatPriceArs(r.desde)}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {inStock ? (
            <>
              <p className="oc-cuotas">Hasta {cuotas} Cuotas sin interés.</p>
              <p className="oc-contado">Pagando contado 10% de descuento</p>
              {sinImp != null && (
                <p className="oc-sin-imp">Sin imp nacionales: {formatPriceArs(sinImp)}</p>
              )}

              <p className="oc-pdp-in-stock">Hay existencias</p>

              <div className="oc-pdp-summary-glass">
                <ProductAddToCart idProducto={product.id_producto} maxQty={maxQty} />
              </div>

              <WishlistLink />

              <DeliveryBlock />
              <BankPromoBlock cuotas={cuotas} cuotaMonto={cuotaMonto} />

              <ProductStoreAvailability items={storeAvailability} />
            </>
          ) : (
            <>
              <p className="oc-pdp-oos-label">Sin existencias</p>
              <ProductReserveForm productTitle={product.titulo} productSku={product.sku} />
              <WishlistLink />

              <div className="oc-pdp-reserve-now">
                <h3>Reservá ahora</h3>
                <p>
                  Contactá a nuestros asesores para conocer las alternativas y/o reservar tu
                  producto.
                </p>
                <a
                  className="oc-btn oc-btn-dark oc-pdp-wa-btn"
                  href={waReserve}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir WhatsApp
                </a>
              </div>

              <DeliveryBlock />
              <BankPromoBlock cuotas={cuotas} cuotaMonto={cuotaMonto} />
            </>
          )}
        </div>
      </div>

      <section className="oc-pdp-description">
        <SpecTilesGrid caracteristicas={caracteristicasEfectivas} />

        <HighlightsSection
          modeloBase={modeloBase}
          highlights={highlights}
          fallbackHtml={cleanFallbackHtml(descripcionConsistente, modeloBase)}
        />

        <TechSpecsTable caracteristicas={caracteristicasEfectivas} />

        {sizeComparison.length > 1 && modeloBase && (
          <div className="oc-pdp-compare-wrap">
            <h2>
              {sizeComparison.map((r) => `${r.tamano}`).join(" o ")}: la misma línea, distinta
              escala.
            </h2>
            <SizeComparisonTable modeloBase={modeloBase} rows={sizeComparison} />
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="oc-pdp-related">
          <h2>Productos relacionados</h2>
          <div className="oc-product-grid">
            {related.map((p) => (
              <ProductCard key={p.id_producto} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
