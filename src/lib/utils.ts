import { Decimal } from "@prisma/client/runtime/library";

export function formatPrice(value: Decimal | number | string | null | undefined): string {
  if (value == null) return "Consultar";
  const num = typeof value === "object" && "toNumber" in value ? value.toNumber() : Number(value);
  if (Number.isNaN(num)) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(num);
}

export function whatsappUrl(productTitle: string, productId: number, intent: "consulta" | "reserva" = "consulta") {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "5491100000000";
  const text =
    intent === "reserva"
      ? encodeURIComponent(
          `Hola OneClick, quiero reservar / consultar alternativas del producto "${productTitle}" (ID ${productId}).`
        )
      : encodeURIComponent(
          `Hola OneClick, quiero consultar por el producto "${productTitle}" (ID ${productId}).`
        );
  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * URL pública de una imagen de producto.
 * - Si `link` ya es http(s), se usa tal cual.
 * - Si hay NEXT_PUBLIC_UPLOADS_BASE_URL (ej. https://aukanairelibre.com/api/uploads), se antepone.
 * - Si no, se usa /api/uploads/... (mismo dominio de la app).
 *
 * No uses URLs del File Manager de Hostinger (srv*-files.hstgr.io/...): no son públicas.
 */
export function uploadPublicUrl(link: string): string {
  if (!link) return "/placeholder-product.svg";
  if (link.startsWith("http://") || link.startsWith("https://")) {
    // File Manager de Hostinger no sirve para el sitio público
    if (link.includes("hstgr.io") && link.includes("/files/")) {
      return "/placeholder-product.svg";
    }
    return link;
  }
  const clean = link.replace(/^\/+/, "");
  const base = (process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || "/api/uploads").replace(/\/+$/, "");
  return `${base}/${clean}`;
}
