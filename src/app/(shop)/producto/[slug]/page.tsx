import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { addToCart } from "@/app/(shop)/carrito/actions";
import { getProductBySlug } from "@/lib/products";
import { formatPriceArs, precioContado, precioSinImpuestos } from "@/lib/pricing";
import { uploadPublicUrl } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export default async function ProductoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const imagen = product.archivos[0]?.archivo.link;
  const cuotas = product.cuotas_max ?? 12;
  const sinImp = precioSinImpuestos(product.precio);
  const contado = precioContado(product.precio);

  return (
    <div className="container">
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
        <div className="oc-gallery">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagen ? uploadPublicUrl(imagen) : "/placeholder-product.svg"}
            alt={product.titulo}
          />
        </div>
        <div>
          {product.marca && (
            <p className="muted">
              <Link href={`/marca/${product.marca.slug}`}>{product.marca.nombre}</Link>
            </p>
          )}
          <h1 style={{ marginTop: 0 }}>{product.titulo}</h1>
          {product.sku && <p className="muted">SKU: {product.sku}</p>}
          <p className="oc-price">{formatPriceArs(product.precio)}</p>
          <p className="oc-cuotas">Hasta {cuotas} Cuotas sin interés.</p>
          <p className="oc-contado">Pagando contado 10% de descuento</p>
          {contado != null && <p className="muted">Contado: {formatPriceArs(contado)}</p>}
          {sinImp != null && (
            <p className="oc-sin-imp">Sin imp nacionales: {formatPriceArs(sinImp)}</p>
          )}
          <p style={{ margin: "1rem 0" }}>
            {product.stockTotal > 0 ? "Disponible" : "Consultar disponibilidad"}
          </p>
          <form action={addToCart}>
            <input type="hidden" name="id_producto" value={product.id_producto} />
            <input type="hidden" name="cantidad" value="1" />
            <button type="submit" className="oc-btn oc-btn-primary">
              Añadir al carrito
            </button>
          </form>
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Descripción</h3>
            <div dangerouslySetInnerHTML={{ __html: product.descripcion }} />
          </div>
          {product.caracteristicas.length > 0 && (
            <div style={{ marginTop: "1.25rem" }}>
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
        </div>
      </div>
    </div>
  );
}
