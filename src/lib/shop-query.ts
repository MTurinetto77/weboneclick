export type ShopQuery = {
  q?: string;
  cat?: string;
  marca?: string;
  min?: string;
  max?: string;
  /** "1" = solo productos con stock */
  stock?: string;
  orden?: string;
  page?: string;
};

export function buildShopHref(
  base: ShopQuery,
  patch: Partial<ShopQuery>,
  basePath = "/shop"
): string {
  const next: ShopQuery = { ...base, ...patch };
  // Al cambiar filtro, volver a página 1 salvo que se pida page explícitamente
  if (!("page" in patch)) delete next.page;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value != null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return qs ? `${path}?${qs}` : path;
}
