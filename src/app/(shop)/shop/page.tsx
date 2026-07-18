import { ProductCard } from "@/components/product-card";
import { getActiveProducts } from "@/lib/products";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const page = Math.max(1, Number(params.page || 1) || 1);
  const take = 24;
  const skip = (page - 1) * take;

  const { items, total } = await getActiveProducts({ q, take, skip });
  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="container">
      <div className="oc-page-header">
        <nav className="oc-breadcrumb">
          <a href="/">Inicio</a>
          <span>/</span>
          <span>Shop</span>
        </nav>
        <h1>Shop</h1>
        <p className="muted">
          {total} producto{total === 1 ? "" : "s"}
          {q ? ` para “${q}”` : ""}
        </p>
      </div>

      <div className="oc-product-grid" style={{ paddingBottom: "2.5rem" }}>
        {items.map((p) => (
          <ProductCard key={p.id_producto} product={p} />
        ))}
      </div>

      {!items.length && <p className="muted">No hay productos para mostrar.</p>}

      {pages > 1 && (
        <div className="oc-tabs" style={{ paddingBottom: "2rem" }}>
          {Array.from({ length: pages }, (_, i) => i + 1)
            .slice(0, 12)
            .map((n) => (
              <a
                key={n}
                href={`/shop?page=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={n === page ? "active" : undefined}
              >
                {n}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
