export type ShopQuery = {
  q?: string;
  cat?: string;
  marca?: string;
  min?: string;
  max?: string;
  orden?: string;
  page?: string;
};

export function buildShopHref(base: ShopQuery, patch: Partial<ShopQuery>): string {
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
  return qs ? `/shop?${qs}` : "/shop";
}
