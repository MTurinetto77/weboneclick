import { prisma } from "@/lib/prisma";

export default async function TiendasPage() {
  const tiendas = await prisma.tienda.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="container">
      <div className="oc-page-header">
        <h1>Tiendas</h1>
        <p className="oc-section-lead">Encontrá la sucursal OneClick más cercana.</p>
      </div>
      <div className="oc-store-grid" style={{ paddingBottom: "2.5rem" }}>
        {tiendas.map((t) => (
          <article key={t.id_tienda} className="oc-store-card">
            <h3 style={{ marginTop: 0 }}>{t.nombre}</h3>
            <p>
              {t.direccion}
              <br />
              {t.localidad}, {t.provincia}
            </p>
            {t.telefono && <p>Tel: {t.telefono}</p>}
            {t.horarios && <p className="muted">{t.horarios}</p>}
          </article>
        ))}
        {!tiendas.length && <p className="muted">Pronto publicaremos el listado de tiendas.</p>}
      </div>
    </div>
  );
}
