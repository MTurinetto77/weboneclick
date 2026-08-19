import { notFound } from "next/navigation";
import Link from "next/link";
import { BuyBar } from "@/components/pdp/buy-bar";
import { HeroStage } from "@/components/pdp/hero-stage";
import { Reveal } from "@/components/reveal";
import { VariantPicker } from "@/components/pdp/variant-picker";
import { ProductAddToCart } from "@/components/product-add-to-cart";
import { getProductBySlug, precioEfectivo, sortProductImageLinks } from "@/lib/products";
import { getDescuentoContadoConfig } from "@/lib/parametros";
import {
  formatPriceArs,
  precioSinImpuestos,
  productoCalificaDescuentoContado,
} from "@/lib/pricing";
import { getMacBookAirStory } from "@/lib/product-story";
import {
  capacidadEnGb,
  getVariantSiblings,
  nombreConfiguracion,
  nombreModelo,
  opcionesDeEje,
  parseVariantAxes,
} from "@/lib/product-variants";
import { uploadPublicUrl } from "@/lib/utils";

import "./preview.css";

type Params = Promise<{ slug: string }>;

const href = (slug: string) => `/producto/${slug}/preview`;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto" };
  const ejes = parseVariantAxes(product.titulo);
  return {
    title: `${nombreModelo(ejes)} — vista previa`,
    robots: { index: false, follow: false },
  };
}

export default async function ProductoPreviewPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const ejes = parseVariantAxes(product.titulo);
  const idCategoria = product.categorias[0]?.id_categoria ?? null;
  const hermanos = idCategoria ? await getVariantSiblings(idCategoria, ejes) : [];

  const venta = precioEfectivo(product.precio, product.precio_con_desc);
  const sinImp = precioSinImpuestos(venta);
  const cuotas = product.cuotas_max ?? 12;
  const cuotaMonto = venta != null && cuotas > 0 ? venta / cuotas : null;
  const descConfig = await getDescuentoContadoConfig();
  const muestraContado = productoCalificaDescuentoContado(
    product.cuotas_max,
    descConfig.umbralCuotas
  );

  const story = getMacBookAirStory(ejes.color?.key ?? "medianoche", ejes.pulgadas, ejes.chip);
  const modelo = nombreModelo(ejes);
  const configuracion = nombreConfiguracion(ejes);

  const opciones = {
    pulgadas: opcionesDeEje("pulgadas", ejes, hermanos, venta),
    color: opcionesDeEje("color", ejes, hermanos, venta),
    almacenamiento: opcionesDeEje("almacenamiento", ejes, hermanos, venta),
    teclado: opcionesDeEje("teclado", ejes, hermanos, venta),
  };

  // Si la familia no tiene guion visual, al menos mostramos la galería del SKU.
  const heroShots =
    story?.hero ??
    sortProductImageLinks(
      product.archivos.map((a) => ({
        link: a.archivo.link,
        tipo: a.archivo.tipo,
        id_archivo: a.archivo.id_archivo,
      }))
    ).map((src) => ({ src, alt: product.titulo, encuadre: "contain" as const }));

  const imagenPrincipal =
    product.archivos.find((a) => a.archivo.tipo === "imagen_principal")?.archivo.link ??
    product.archivos[0]?.archivo.link ??
    null;

  const acento = ejes.color?.hex ?? "#2E3641";
  const acentoSuave = ejes.color?.hexSoft ?? "#3D4753";
  const acentoTinta = ejes.color?.tinta ?? "#ffffff";

  const lineaCompleta = [...hermanos].sort((a, b) => {
    const porColor = (a.ejes.color?.label ?? "").localeCompare(b.ejes.color?.label ?? "", "es");
    if (porColor !== 0) return porColor;
    return (
      capacidadEnGb(a.ejes.almacenamiento ?? "") - capacidadEnGb(b.ejes.almacenamiento ?? "")
    );
  });

  const ficha: { label: string; valor: string }[] = [
    { label: "Chip", valor: ejes.chip ? `Apple ${ejes.chip}` : "—" },
    { label: "CPU", valor: ejes.cpu ? `${ejes.cpu} núcleos` : "—" },
    { label: "GPU", valor: ejes.gpu ? `${ejes.gpu} núcleos` : "—" },
    { label: "Memoria unificada", valor: ejes.ram ?? "—" },
    { label: "Almacenamiento", valor: ejes.almacenamiento ? `${ejes.almacenamiento} SSD` : "—" },
    { label: "Pantalla", valor: ejes.pulgadas === "15" ? 'Liquid Retina 15,3"' : 'Liquid Retina 13,6"' },
    { label: "Color", valor: ejes.color?.label ?? "—" },
    { label: "Teclado", valor: `Magic Keyboard · ${ejes.teclado}` },
    { label: "Parte n.º", valor: product.sku ?? "—" },
  ];

  return (
    <div
      className="ocx-pdp"
      style={
        {
          "--ocx-acento": acento,
          "--ocx-acento-suave": acentoSuave,
          "--ocx-acento-tinta": acentoTinta,
        } as React.CSSProperties
      }
    >
      <div className="container">
        <nav className="ocx-breadcrumb">
          <Link href="/">Inicio</Link>
          <span aria-hidden>/</span>
          {product.categorias[0] && (
            <>
              <Link href={`/${product.categorias[0].categoria.slug}`}>
                {product.categorias[0].categoria.nombre}
              </Link>
              <span aria-hidden>/</span>
            </>
          )}
          <span>{modelo}</span>
        </nav>
      </div>

      <div className="container">
        <HeroStage shots={heroShots}>
          <div className="ocx-buybox">
            <Reveal desde="abajo">
              {product.marca && <p className="ocx-eyebrow">{product.marca.nombre}</p>}
              <h1 className="ocx-title">{modelo}</h1>
              {configuracion && <p className="ocx-subtitle">{configuracion}</p>}
            </Reveal>

            <Reveal desde="abajo" delay={60}>
              <div className="ocx-price-block">
                {product.porcentaje_desc != null &&
                product.porcentaje_desc > 0 &&
                product.precio_con_desc != null ? (
                  <>
                    <p className="ocx-price-old">{formatPriceArs(product.precio)}</p>
                    <p className="ocx-price-row">
                      <span className="ocx-price-pct">−{Math.round(product.porcentaje_desc)}%</span>
                      <span className="ocx-price">{formatPriceArs(product.precio_con_desc)}</span>
                    </p>
                  </>
                ) : (
                  <p className="ocx-price">{formatPriceArs(venta)}</p>
                )}
                <p className="ocx-price-note">
                  {cuotaMonto != null
                    ? `${cuotas} cuotas sin interés de ${formatPriceArs(cuotaMonto)}`
                    : `Hasta ${cuotas} cuotas sin interés`}
                </p>
                {muestraContado && (
                  <p className="ocx-price-contado">
                    {descConfig.porcentaje}% de descuento pagando de contado
                  </p>
                )}
                {sinImp != null && (
                  <p className="ocx-price-imp">
                    Sin impuestos nacionales: {formatPriceArs(sinImp)}
                  </p>
                )}
              </div>
            </Reveal>

            <Reveal desde="abajo" delay={100}>
              <div className="ocx-pickers">
                <VariantPicker
                  titulo="Tamaño"
                  seleccion={ejes.pulgadas}
                  opciones={opciones.pulgadas}
                  hrefDe={href}
                />
                <VariantPicker
                  titulo="Color"
                  seleccion={ejes.color?.key ?? null}
                  opciones={opciones.color}
                  variante="swatch"
                  hrefDe={href}
                />
                <VariantPicker
                  titulo="Almacenamiento"
                  seleccion={ejes.almacenamiento}
                  opciones={opciones.almacenamiento}
                  hrefDe={href}
                />
                <VariantPicker
                  titulo="Teclado"
                  seleccion={ejes.teclado}
                  opciones={opciones.teclado}
                  hrefDe={href}
                />
              </div>
            </Reveal>

            <Reveal desde="abajo" delay={140}>
              <div className="ocx-buy">
                <p className={`ocx-stock${product.inStock ? "" : " is-off"}`}>
                  <span className="ocx-stock-dot" aria-hidden />
                  {product.inStock ? "Disponible — entrega en 24 h en AMBA" : "Sin stock"}
                </p>

                {product.inStock ? (
                  <ProductAddToCart
                    idProducto={product.id_producto}
                    maxQty={
                      product.stockTracked && product.stockTotal > 0
                        ? Math.min(99, Math.floor(product.stockTotal))
                        : 99
                    }
                  />
                ) : (
                  <Link href="/lista-deseos" className="ocx-btn ocx-btn-ghost">
                    Avisame cuando vuelva
                  </Link>
                )}

                <ul className="ocx-perks">
                  <li>Envío gratis a todo el país</li>
                  <li>Garantía oficial Apple 12 meses</li>
                  <li>Retiro en 10 sucursales</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </HeroStage>
      </div>

      {story?.bandas.map((banda) => (
        <section key={banda.id} className={`ocx-banda ocx-banda-${banda.layout} ocx-tono-${banda.tono ?? "claro"}`}>
          <div className="container ocx-banda-inner">
            <Reveal desde={banda.layout === "figura-izquierda" ? "derecha" : "izquierda"} className="ocx-banda-texto">
              <p className="ocx-kicker">{banda.kicker}</p>
              <h2 className="ocx-banda-titulo">{banda.titulo}</h2>
              <p className="ocx-banda-copy">{banda.copy}</p>
              {banda.datos && (
                <dl className="ocx-datos">
                  {banda.datos.map((d, i) => (
                    <Reveal key={d.label} desde="abajo" delay={80 * i} className="ocx-dato">
                      <dt>{d.valor}</dt>
                      <dd>{d.label}</dd>
                    </Reveal>
                  ))}
                </dl>
              )}
            </Reveal>

            <Reveal desde="escala" delay={80} className="ocx-banda-figura">
              {banda.shots.map((shot) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={shot.src}
                  src={uploadPublicUrl(shot.src)}
                  alt={shot.alt}
                  className="ocx-banda-img"
                  style={{ objectFit: shot.encuadre ?? "contain" }}
                  loading="lazy"
                />
              ))}
            </Reveal>
          </div>
        </section>
      ))}

      <section className="ocx-ficha">
        <div className="container">
          <Reveal desde="abajo">
            <p className="ocx-kicker">Ficha técnica</p>
            <h2 className="ocx-banda-titulo">Lo que estás llevando.</h2>
          </Reveal>
          <Reveal desde="abajo" delay={80}>
            <dl className="ocx-ficha-grid">
              {ficha.map((f) => (
                <div key={f.label} className="ocx-ficha-fila">
                  <dt>{f.label}</dt>
                  <dd>{f.valor}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {lineaCompleta.length > 1 && (
        <section className="ocx-linea">
          <div className="container">
            <Reveal desde="abajo">
              <p className="ocx-kicker">La línea completa</p>
              <h2 className="ocx-banda-titulo">
                {lineaCompleta.length} configuraciones, un mismo criterio.
              </h2>
              <p className="ocx-banda-copy ocx-linea-copy">
                Los títulos llegan de Odoo escritos de distintas maneras. Acá se muestran
                normalizados, sin tocar el dato original.
              </p>
            </Reveal>

            <div className="ocx-linea-grid">
              {lineaCompleta.map((h, i) => (
                <Reveal key={h.idProducto} desde="abajo" delay={Math.min(240, 40 * i)}>
                  <Link
                    href={href(h.slug)}
                    className={`ocx-linea-card${h.slug === product.slug ? " is-active" : ""}`}
                  >
                    <span
                      className="ocx-linea-swatch"
                      style={{
                        background: `linear-gradient(145deg, ${h.ejes.color?.hexSoft ?? "#ddd"} 0%, ${h.ejes.color?.hex ?? "#bbb"} 62%)`,
                      }}
                      aria-hidden
                    />
                    <span className="ocx-linea-nombre">{nombreModelo(h.ejes)}</span>
                    <span className="ocx-linea-config">
                      {h.ejes.color?.label} · {h.ejes.almacenamiento} · {h.ejes.ram}
                    </span>
                    <span className="ocx-linea-teclado">Teclado {h.ejes.teclado}</span>
                    <span className="ocx-linea-precio">{formatPriceArs(h.precioEfectivo)}</span>
                    {!h.inStock && <span className="ocx-linea-oos">Sin stock</span>}
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <BuyBar
        idProducto={product.id_producto}
        titulo={modelo}
        configuracion={[ejes.color?.label, ejes.almacenamiento].filter(Boolean).join(" · ")}
        precio={formatPriceArs(venta)}
        cuotas={cuotaMonto != null ? `${cuotas}× ${formatPriceArs(cuotaMonto)}` : null}
        imagen={imagenPrincipal}
        disponible={product.inStock}
      />
    </div>
  );
}
