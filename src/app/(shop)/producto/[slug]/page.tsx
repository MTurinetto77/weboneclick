import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductAddToCart } from "@/components/product-add-to-cart";
import { ProductCard } from "@/components/product-card";
import { ProductReserveForm } from "@/components/product-reserve-form";
import { getActiveProducts, getProductBySlug } from "@/lib/products";
import { formatPriceArs, precioSinImpuestos } from "@/lib/pricing";
import { uploadPublicUrl, whatsappUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

const STORE_AVAILABILITY = [
  "Palermo Soho",
  "Solar Shopping",
  "Rosario Centro",
  "Cordoba Shopping",
  "Envío a Domicilio",
  "Alto Rosario",
  "DOT Baires Shopping",
];

function DeliveryBlock() {
  return (
    <div className="oc-pdp-delivery">
      <span className="oc-pdp-delivery-icon" aria-hidden>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 7h11v10H3V7zm11 3h4l3 3v4h-2.5a2 2 0 11-4 0H12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      <div>
        <strong>Entrega dentro de las 24hs en AMBA</strong>
        <p>Recibilo en 24hs comprando antes de las 12hs</p>
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
      <p className="oc-pdp-bank-title">{cuotas} cuotas sin interés</p>
      <p className="muted">
        Con todas las tarjetas y bancos
        {cuotaMonto != null ? ` — Cuotas de ${formatPriceArs(cuotaMonto)}` : null}
      </p>
      <ul className="oc-pdp-bank-cards" aria-label="Tarjetas">
        <li>Mastercard</li>
        <li>VISA</li>
      </ul>
      <Link href="/ocbeneficios" className="oc-pdp-bank-link">
        Ver promociones bancarias →
      </Link>
    </div>
  );
}

export default async function ProductoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const imagenes = product.archivos
    .map((a) => a.archivo.link)
    .filter(Boolean) as string[];
  const mainImage = imagenes[0];
  const cuotas = product.cuotas_max ?? 12;
  const sinImp = precioSinImpuestos(product.precio);
  const inStock = product.inStock;
  const cuotaMonto =
    product.precio != null && cuotas > 0 ? Number(product.precio) / cuotas : null;
  const waReserve = whatsappUrl(product.titulo, product.id_producto, "reserva");
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

  return (
    <div className="container oc-pdp">
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
          <span>{product.titulo}</span>
        </nav>
      </div>

      <div className="oc-product-detail">
        <div className={`oc-gallery${inStock ? "" : " oc-gallery-oos"}`}>
          {!inStock && <span className="oc-pdp-badge-oos">Sin Stock</span>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mainImage ? uploadPublicUrl(mainImage) : "/placeholder-product.svg"}
            alt={product.titulo}
            className="oc-gallery-main"
          />
          {imagenes.length > 1 && (
            <div className="oc-gallery-thumbs">
              {imagenes.slice(0, 4).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={uploadPublicUrl(src)} alt="" />
              ))}
            </div>
          )}
        </div>

        <div className="oc-pdp-buybox">
          {product.marca && (
            <p className="oc-pdp-brand">
              <Link href={`/marca/${product.marca.slug}`}>{product.marca.nombre}</Link>
            </p>
          )}
          <h1>{product.titulo}</h1>
          <p className="oc-price">{formatPriceArs(product.precio)}</p>

          {inStock ? (
            <>
              <p className="oc-cuotas">Hasta {cuotas} Cuotas sin interés.</p>
              <p className="oc-contado">Pagando contado 10% de descuento</p>
              {sinImp != null && (
                <p className="oc-sin-imp">Sin imp nacionales: {formatPriceArs(sinImp)}</p>
              )}

              <p className="oc-pdp-in-stock">Hay existencias</p>

              <ProductAddToCart idProducto={product.id_producto} maxQty={maxQty} />

              <Link href="/lista-deseos" className="oc-pdp-wishlist">
                Añadir a lista de deseos
              </Link>

              <DeliveryBlock />
              <BankPromoBlock cuotas={cuotas} cuotaMonto={cuotaMonto} />

              <div className="oc-pdp-stores">
                <h4>Disponibilidad en tiendas</h4>
                <ul>
                  {STORE_AVAILABILITY.map((name) => (
                    <li key={name}>
                      <strong>{name}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <p className="oc-pdp-oos-label">Sin existencias</p>
              <ProductReserveForm productTitle={product.titulo} productSku={product.sku} />
              <Link href="/lista-deseos" className="oc-pdp-wishlist">
                Añadir a lista de deseos
              </Link>

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
        <h2>Descripción</h2>
        <div dangerouslySetInnerHTML={{ __html: product.descripcion }} />
        {product.caracteristicas.length > 0 && (
          <div className="oc-pdp-specs">
            <h3>Características</h3>
            <ul>
              {product.caracteristicas.map((c) => (
                <li key={c.id_caracteristica}>
                  <strong>{c.caracteristica.nombre}:</strong> {c.valor}
                </li>
              ))}
            </ul>
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
