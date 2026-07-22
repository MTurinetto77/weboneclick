import Link from "next/link";
import { ShopPriceSlider } from "@/components/shop-price-slider";
import { buildShopHref, type ShopQuery } from "@/lib/shop-query";
import type { ShopBrandFacet, ShopCategoryNode, ShopFacets } from "@/lib/products";

export type { ShopQuery };
export { buildShopHref };

type Props = {
  facets: ShopFacets;
  query: ShopQuery;
};

export function ShopSidebar({ facets, query }: Props) {
  return (
    <aside className="oc-shop-sidebar">
      <ShopPriceSlider
        priceMin={facets.priceMin}
        priceMax={facets.priceMax}
        query={query}
      />
      <CategoryFilter categories={facets.categories} query={query} />
      <BrandFilter brands={facets.brands} query={query} />
    </aside>
  );
}

function CategoryFilter({
  categories,
  query,
}: {
  categories: ShopCategoryNode[];
  query: ShopQuery;
}) {
  return (
    <section className="oc-shop-facet">
      <h3>Categoría</h3>
      <ul className="oc-shop-cat-list">
        {categories.map((cat) => (
          <CategoryItem key={cat.id_categoria} cat={cat} query={query} />
        ))}
      </ul>
      {query.cat && (
        <Link className="oc-shop-clear" href={buildShopHref(query, { cat: undefined })}>
          Quitar categoría
        </Link>
      )}
    </section>
  );
}

function CategoryItem({ cat, query }: { cat: ShopCategoryNode; query: ShopQuery }) {
  const active = query.cat === cat.slug;
  const childActive = cat.children.some((c) => c.slug === query.cat);

  return (
    <li className={active || childActive ? "is-open" : undefined}>
      <Link
        href={buildShopHref(query, { cat: active ? undefined : cat.slug })}
        className={active ? "is-active" : undefined}
      >
        <span>{cat.nombre}</span>
        <span className="oc-shop-count">{cat.count}</span>
      </Link>
      {!!cat.children.length && (
        <ul className="oc-shop-cat-children">
          {cat.children.map((child) => (
            <li key={child.id_categoria}>
              <Link
                href={buildShopHref(query, {
                  cat: query.cat === child.slug ? undefined : child.slug,
                })}
                className={query.cat === child.slug ? "is-active" : undefined}
              >
                <span>{child.nombre}</span>
                <span className="oc-shop-count">{child.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function BrandFilter({ brands, query }: { brands: ShopBrandFacet[]; query: ShopQuery }) {
  return (
    <section className="oc-shop-facet">
      <h3>Marca</h3>
      <ul className="oc-shop-brand-list">
        {brands.map((brand) => {
          const active = query.marca === brand.slug;
          return (
            <li key={brand.id_marca}>
              <Link
                href={buildShopHref(query, {
                  marca: active ? undefined : brand.slug,
                })}
                className={active ? "is-active" : undefined}
              >
                <span>{brand.nombre}</span>
                <span className="oc-shop-count">{brand.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {query.marca && (
        <Link className="oc-shop-clear" href={buildShopHref(query, { marca: undefined })}>
          Quitar marca
        </Link>
      )}
    </section>
  );
}
