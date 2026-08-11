import { prisma } from "@/lib/prisma";
import { publicSiteUrl } from "@/lib/mercadopago";
import {
  precioEfectivo,
  resolveStockAvailability,
  sortProductImageLinks,
} from "@/lib/products";
import { uploadPublicUrl } from "@/lib/utils";

const CURRENCY = "ARS";
const MAX_TITLE = 150;
const MAX_DESCRIPTION = 5000;
const MAX_ADDITIONAL_IMAGES = 10;

export type GoogleMerchantFeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  additional_image_links: string[];
  availability: "in stock" | "out of stock";
  price: string;
  sale_price: string | null;
  brand: string;
  condition: "new";
  mpn: string | null;
  identifier_exists: boolean;
  product_type: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function formatMoney(amount: number): string {
  return `${amount.toFixed(2)} ${CURRENCY}`;
}

function absoluteUrl(pathOrUrl: string, siteUrl: string): string | null {
  if (!pathOrUrl || pathOrUrl.includes("placeholder-product")) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl}${path}`;
}

/**
 * Productos activos listos para Google Merchant Center (RSS 2.0).
 * `id` = id_producto (mismo que Meta Pixel content_ids).
 */
export async function loadGoogleMerchantFeedItems(): Promise<{
  siteUrl: string;
  items: GoogleMerchantFeedItem[];
  skipped: { noPrice: number; noImage: number };
}> {
  const siteUrl = publicSiteUrl();
  const today = new Date();

  const products = await prisma.producto.findMany({
    where: { activo: true },
    select: {
      id_producto: true,
      titulo: true,
      slug: true,
      descripcion: true,
      sku: true,
      marca: { select: { nombre: true } },
      categorias: {
        take: 1,
        select: { categoria: { select: { nombre: true } } },
      },
      precios: {
        where: { fecha_desde: { lte: today } },
        orderBy: { fecha_desde: "desc" },
        take: 1,
        select: {
          precio: true,
          precio_con_desc: true,
        },
      },
      archivos: {
        select: {
          archivo: { select: { link: true, tipo: true, id_archivo: true } },
        },
      },
      stocks: {
        include: {
          almacen: {
            select: {
              odoo_id: true,
              id_tienda: true,
              es_envio_domicilio: true,
            },
          },
        },
      },
    },
    orderBy: { id_producto: "asc" },
  });

  const items: GoogleMerchantFeedItem[] = [];
  let noPrice = 0;
  let noImage = 0;

  for (const p of products) {
    const priceRow = p.precios[0];
    if (!priceRow) {
      noPrice += 1;
      continue;
    }

    const listPrice = Number(priceRow.precio);
    const saleCandidate =
      priceRow.precio_con_desc != null ? Number(priceRow.precio_con_desc) : null;
    const effective = precioEfectivo(listPrice, saleCandidate);
    if (effective == null || !Number.isFinite(effective) || effective <= 0) {
      noPrice += 1;
      continue;
    }

    const imageLinks = sortProductImageLinks(
      p.archivos
        .map((a) => a.archivo)
        .filter((a): a is { link: string; tipo: string; id_archivo: number } =>
          Boolean(a.link)
        )
    );
    const absoluteImages = imageLinks
      .map((link) => absoluteUrl(uploadPublicUrl(link), siteUrl))
      .filter((u): u is string => Boolean(u));

    if (!absoluteImages.length) {
      noImage += 1;
      continue;
    }

    const hasSale =
      saleCandidate != null &&
      saleCandidate > 0 &&
      saleCandidate < listPrice &&
      Number.isFinite(listPrice);

    const stock = resolveStockAvailability(p.stocks);
    const brand = (p.marca?.nombre || "OneClick").trim() || "OneClick";
    const mpn = p.sku?.trim() || null;
    const rawDescription = stripHtml(p.descripcion || "") || p.titulo;
    const productType = p.categorias[0]?.categoria.nombre?.trim() || null;

    items.push({
      id: String(p.id_producto),
      title: truncate(p.titulo.trim(), MAX_TITLE),
      description: truncate(rawDescription, MAX_DESCRIPTION),
      link: `${siteUrl}/producto/${p.slug}`,
      image_link: absoluteImages[0],
      additional_image_links: absoluteImages.slice(1, 1 + MAX_ADDITIONAL_IMAGES),
      availability: stock.inStock ? "in stock" : "out of stock",
      price: formatMoney(hasSale ? listPrice : effective),
      sale_price: hasSale ? formatMoney(saleCandidate!) : null,
      brand,
      condition: "new",
      mpn,
      identifier_exists: Boolean(mpn),
      product_type: productType,
    });
  }

  return { siteUrl, items, skipped: { noPrice, noImage } };
}

/** RSS 2.0 + namespace g: para Scheduled fetch en Merchant Center. */
export function buildGoogleMerchantRssXml(input: {
  siteUrl: string;
  items: GoogleMerchantFeedItem[];
  title?: string;
}): string {
  const title = input.title ?? "OneClick Store";
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">`,
    `<channel>`,
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(input.siteUrl)}</link>`,
    `<description>${escapeXml("Catálogo de productos OneClick")}</description>`,
  ];

  for (const item of input.items) {
    lines.push(`<item>`);
    lines.push(`<g:id>${escapeXml(item.id)}</g:id>`);
    lines.push(`<title>${escapeXml(item.title)}</title>`);
    lines.push(`<description>${escapeXml(item.description)}</description>`);
    lines.push(`<link>${escapeXml(item.link)}</link>`);
    lines.push(`<g:image_link>${escapeXml(item.image_link)}</g:image_link>`);
    for (const extra of item.additional_image_links) {
      lines.push(
        `<g:additional_image_link>${escapeXml(extra)}</g:additional_image_link>`
      );
    }
    lines.push(`<g:availability>${item.availability}</g:availability>`);
    lines.push(`<g:condition>${item.condition}</g:condition>`);
    lines.push(`<g:price>${escapeXml(item.price)}</g:price>`);
    if (item.sale_price) {
      lines.push(`<g:sale_price>${escapeXml(item.sale_price)}</g:sale_price>`);
    }
    lines.push(`<g:brand>${escapeXml(item.brand)}</g:brand>`);
    if (item.mpn) {
      lines.push(`<g:mpn>${escapeXml(item.mpn)}</g:mpn>`);
    }
    lines.push(
      `<g:identifier_exists>${item.identifier_exists ? "yes" : "no"}</g:identifier_exists>`
    );
    if (item.product_type) {
      lines.push(
        `<g:product_type>${escapeXml(item.product_type)}</g:product_type>`
      );
    }
    lines.push(`</item>`);
  }

  lines.push(`</channel>`);
  lines.push(`</rss>`);
  return `${lines.join("\n")}\n`;
}
