import { prisma } from "@/lib/prisma";
import { uploadPublicUrl } from "@/lib/utils";
import { AltaProveedorForm } from "@/components/alta-proveedor-form";

export const metadata = { title: "Información fiscal" };

function constanciaHref(item: { archivo: string | null; url_externa: string | null }) {
  if (item.archivo) return uploadPublicUrl(item.archivo);
  if (item.url_externa) return item.url_externa;
  return null;
}

export default async function FiscalPage() {
  const constancias = await prisma.constancia_fiscal.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { titulo: "asc" }],
  });

  const impositivas = constancias.filter((c) => c.categoria === "impositiva");
  const bancarias = constancias.filter((c) => c.categoria === "bancaria");
  const exclusiones = constancias.filter((c) => c.categoria === "exclusion");

  return (
    <div className="oc-fiscal-page">
      <header className="container oc-fiscal-hero">
        <h1>
          Datos <strong>Fiscales</strong>
        </h1>
        <p>Información de situación impositiva de OneClick Argentino SRL</p>
      </header>

      <section className="container oc-fiscal-block">
        <h2 className="oc-fiscal-kicker">Información general</h2>
        <div className="oc-fiscal-info-grid">
          <article>
            <h3>
              Agentes de recaudación
              <br />
              de impuestos nacionales
            </h3>
            <ul>
              <li>Agentes de Retención del Impuesto a las Ganancias</li>
              <li>Agentes de Retención Contribuciones Patronales</li>
            </ul>
          </article>
          <article>
            <h3>
              Agentes de recaudación
              <br />
              de impuestos provinciales
            </h3>
            <ul>
              <li>901 — CABA</li>
              <li>902 — Buenos Aires</li>
              <li>904 — Córdoba</li>
              <li>921 — Santa Fe</li>
            </ul>
          </article>
          <article>
            <h3>
              Exclusiones de retenciones / percepciones
              <br />
              impuestos nacionales
            </h3>
            {exclusiones.length ? (
              <div className="oc-fiscal-downloads">
                {exclusiones.map((c) => (
                  <ConstanciaCard key={c.id_constancia} titulo={c.titulo} href={constanciaHref(c)} />
                ))}
              </div>
            ) : (
              <p className="muted">Consultá la documentación vigente en nuestras constancias.</p>
            )}
          </article>
        </div>
      </section>

      <section className="container oc-fiscal-block">
        <h2>Descargá nuestras constancias</h2>
        <div className="oc-fiscal-downloads">
          {impositivas.map((c) => (
            <ConstanciaCard key={c.id_constancia} titulo={c.titulo} href={constanciaHref(c)} />
          ))}
          {!impositivas.length && (
            <p className="muted">Pronto publicaremos las constancias impositivas.</p>
          )}
        </div>
      </section>

      <section className="container oc-fiscal-block">
        <h2>Datos bancarios</h2>
        <p className="oc-fiscal-sub">Descargá nuestras constancias bancarias</p>
        <div className="oc-fiscal-downloads">
          {bancarias.map((c) => (
            <ConstanciaCard key={c.id_constancia} titulo={c.titulo} href={constanciaHref(c)} />
          ))}
          {!bancarias.length && (
            <p className="muted">Pronto publicaremos las constancias bancarias.</p>
          )}
        </div>
      </section>

      <section className="container oc-fiscal-block" id="proveedores">
        <h2>
          Alta de <strong>Proveedores</strong>
        </h2>
        <AltaProveedorForm />
      </section>
    </div>
  );
}

function ConstanciaCard({ titulo, href }: { titulo: string; href: string | null }) {
  const content = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/oneclick/pages/download-pdf.svg" alt="" />
      <span className="oc-fiscal-dl-brand">OneClick</span>
      <span className="oc-fiscal-dl-title">{titulo}</span>
    </>
  );

  if (!href) {
    return <div className="oc-fiscal-dl oc-fiscal-dl-disabled">{content}</div>;
  }

  return (
    <a className="oc-fiscal-dl" href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}
