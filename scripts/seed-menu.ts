/**
 * Seed del menú principal — inserta la estructura actual hardcodeada.
 * Idempotente: si ya existen registros en menu_item, no hace nada.
 *
 * Uso: npx tsx scripts/seed-menu.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Child = {
  label: string;
  href: string;
  /** Slug de la categoría en Odoo (flat). Se resuelve a id_categoria en el seed. */
  catSlug?: string;
  badge?: string;
  icon?: string;
  variant?: "product" | "link";
};

type MenuItem = {
  label: string;
  href: string;
  catSlug?: string;
  shopLabel?: string;
  tipo: "dinamico" | "fijo";
  dynamicChildren?: string;
  children?: Child[];
};

const MENU: MenuItem[] = [
  {
    label: "Mac",
    href: "/mac",
    catSlug: "mac",
    shopLabel: "Shop Mac →",
    tipo: "dinamico",
    children: [
      { label: "MacBook Neo", href: "/mac/macbook-neo", badge: "Nuevas", variant: "product" },
      { label: "MacBook Air", href: "/mac/macbook-air", catSlug: "mac-macbook-air", badge: "Nuevas", variant: "product" },
      { label: "MacBook Pro", href: "/mac/macbook-pro", catSlug: "mac-macbook-pro", badge: "Nuevas", variant: "product" },
      { label: "iMac", href: "/mac/imac", catSlug: "mac-imac", variant: "product" },
      { label: "Mac mini", href: "/mac/mac-mini", catSlug: "mac-mac-mini", variant: "product" },
      { label: "Mac Studio →", href: "/mac/mac-studio", catSlug: "mac-mac-studio", variant: "link" },
      { label: "Displays →", href: "/mac/studio-display", catSlug: "mac-studio-display", variant: "link" },
      { label: "Accesorios →", href: "/accesorios", catSlug: "accesorios", variant: "link" },
    ],
  },
  {
    label: "iPhone",
    href: "/iphone",
    catSlug: "iphone",
    shopLabel: "Shop iPhone →",
    tipo: "dinamico",
    children: [
      { label: "iPhone 17 Pro", href: "/iphone/iphone-17-pro", catSlug: "iphone-iphone-17-pro", badge: "Nuevos", variant: "product" },
      { label: "iPhone Air", href: "/iphone/iphone-air", catSlug: "iphone-iphone-air", badge: "Nuevos", variant: "product" },
      { label: "iPhone 17", href: "/iphone/iphone-17", catSlug: "iphone-iphone-17", badge: "Nuevos", variant: "product" },
      { label: "iPhone 17e", href: "/iphone/iphone-17", catSlug: "iphone-iphone-17", variant: "product" },
      { label: "iPhone 16", href: "/iphone/iphone-16", catSlug: "iphone-iphone-16", variant: "product" },
      { label: "iPhone 15", href: "/iphone/iphone-15", catSlug: "iphone-iphone-15", variant: "product" },
      { label: "Cargadores →", href: "/accesorios/cargadores", catSlug: "accesorios-cargadores", variant: "link" },
      { label: "Accesorios →", href: "/accesorios", catSlug: "accesorios", variant: "link" },
    ],
  },
  {
    label: "iPad",
    href: "/ipad",
    catSlug: "ipad",
    shopLabel: "Shop iPad →",
    tipo: "dinamico",
    children: [
      { label: "iPad Pro", href: "/ipad/ipad-pro", catSlug: "ipad-ipad-pro", badge: "Nuevos", variant: "product" },
      { label: "iPad Air", href: "/ipad/ipad-air", catSlug: "ipad-ipad-air", badge: "Nuevos", variant: "product" },
      { label: "iPad mini", href: "/ipad/ipad-mini", catSlug: "ipad-ipad-mini", variant: "product" },
      { label: "iPad", href: "/ipad", catSlug: "ipad-ipad", variant: "product" },
      { label: "Teclado, mouse y pencil →", href: "/accesorios/teclados-mouse-y-pencil", catSlug: "accesorios-teclados-mouse-y-pencil", variant: "link" },
      { label: "Accesorios →", href: "/accesorios", catSlug: "accesorios", variant: "link" },
    ],
  },
  {
    label: "AirPods",
    href: "/airpods",
    catSlug: "airpods",
    shopLabel: "Shop AirPods →",
    tipo: "dinamico",
    children: [
      { label: "AirPods Max", href: "/airpods/airpods-max", catSlug: "airpods-airpods-max", badge: "Nuevos", variant: "product" },
      { label: "AirPods Pro 3", href: "/airpods/airpods-pro", catSlug: "airpods-airpods-pro", badge: "Nuevos", variant: "product" },
      { label: "AirPods Pro 2", href: "/airpods/airpods-pro", catSlug: "airpods-airpods-pro", variant: "product" },
      { label: "AirPods 4", href: "/airpods/airpods-airpods", catSlug: "airpods-airpods", variant: "product" },
      { label: "Fundas y Cobertores →", href: "/accesorios/fundas-y-cobertores", catSlug: "accesorios-fundas-y-cobertores", variant: "link" },
      { label: "Accesorios →", href: "/accesorios", catSlug: "accesorios", variant: "link" },
    ],
  },
  {
    label: "Apple Watch",
    href: "/watch",
    catSlug: "watch",
    shopLabel: "Shop Apple Watch →",
    tipo: "dinamico",
    children: [
      { label: "Apple Watch Series", href: "/watch/watch-serie", catSlug: "watch-watch-serie", badge: "Nuevos", variant: "product" },
      { label: "Apple Watch SE", href: "/watch/watch-se", catSlug: "watch-watch-se", badge: "Nuevos", variant: "product" },
      { label: "Apple Watch Ultra", href: "/watch/watch-ultra", catSlug: "watch-watch-ultra", badge: "Nuevos", variant: "product" },
      { label: "Correa Apple Watch →", href: "/accesorios/correa-apple-watch", catSlug: "accesorios-correa-apple-watch", variant: "link" },
      { label: "Accesorios →", href: "/accesorios", catSlug: "accesorios", variant: "link" },
    ],
  },
  { label: "Apple TV", href: "/apple-tv", catSlug: "apple-tv", tipo: "dinamico" },
  {
    label: "Audio",
    href: "/audio",
    catSlug: "audio",
    shopLabel: "Shop Audio →",
    tipo: "dinamico",
    children: [
      { label: "JBL Auriculares", href: "/audio/auriculares", catSlug: "audio-auriculares", variant: "product" },
      { label: "JBL Parlantes", href: "/audio/parlantes", catSlug: "audio-parlantes", variant: "product" },
    ],
  },
  {
    label: "Accesorios",
    href: "/accesorios",
    catSlug: "accesorios",
    shopLabel: "Shop Accesorios →",
    tipo: "dinamico",
    children: [
      { label: "AirTag", href: "/accesorios/airtag", catSlug: "accesorios-airtag", variant: "product" },
      { label: "Cargadores", href: "/accesorios/cargadores", catSlug: "accesorios-cargadores", variant: "product" },
      { label: "Cables y Adaptadores", href: "/accesorios/cables-y-adaptadores", catSlug: "accesorios-cables-y-adaptadores", variant: "product" },
      { label: "Protectores de pantalla", href: "/accesorios/protectores-de-pantalla", catSlug: "accesorios-protectores-de-pantalla", variant: "product" },
      { label: "Teclados Mouse y Pencil", href: "/accesorios/teclados-mouse-y-pencil", catSlug: "accesorios-teclados-mouse-y-pencil", variant: "product" },
      { label: "Bolsos y Mochilas", href: "/accesorios/bolsos-y-mochilas", catSlug: "accesorios-bolsos-y-mochilas", variant: "product" },
      { label: "Fundas y Cobertores", href: "/accesorios/fundas-y-cobertores", catSlug: "accesorios-fundas-y-cobertores", variant: "product" },
      { label: "Correa Apple Watch", href: "/accesorios/correa-apple-watch", catSlug: "accesorios-correa-apple-watch", variant: "product" },
      { label: "Gaming", href: "/accesorios/gaming", catSlug: "accesorios-gaming", variant: "product" },
      { label: "Otros", href: "/accesorios/otros", catSlug: "accesorios-otros", variant: "product" },
    ],
  },
  { label: "Outlet", href: "/outlet", tipo: "dinamico" },
  {
    label: "Promociones",
    href: "/promo",
    shopLabel: "Shop Promo →",
    tipo: "fijo",
    dynamicChildren: "promociones",
  },
  { label: "Servicio Técnico", href: "/servicio-tecnico", tipo: "fijo" },
  { label: "Empresas", href: "/empresas", tipo: "fijo" },
];

async function resolveCat(slug?: string): Promise<number | null> {
  if (!slug) return null;
  const cat = await prisma.categoria.findUnique({ where: { slug }, select: { id_categoria: true } });
  return cat?.id_categoria ?? null;
}

async function main() {
  const count = await prisma.menu_item.count();
  if (count > 0) {
    console.log(`menu_item ya tiene ${count} registros, skip.`);
    return;
  }

  for (let i = 0; i < MENU.length; i++) {
    const m = MENU[i];
    const id_categoria = await resolveCat(m.catSlug);
    const item = await prisma.menu_item.create({
      data: {
        label: m.label,
        href: m.href,
        id_categoria,
        shop_label: m.shopLabel ?? null,
        tipo: m.tipo,
        dynamic_children: m.dynamicChildren ?? null,
        orden: (i + 1) * 10,
        activo: true,
      },
    });

    if (m.children?.length) {
      for (let j = 0; j < m.children.length; j++) {
        const c = m.children[j];
        const childCatId = await resolveCat(c.catSlug);
        await prisma.menu_item_hijo.create({
          data: {
            id_menu_item: item.id_menu_item,
            label: c.label,
            href: c.href,
            id_categoria: childCatId,
            badge: c.badge ?? null,
            icon: c.icon ?? null,
            variant: c.variant ?? "product",
            orden: (j + 1) * 10,
            activo: true,
          },
        });
      }
    }

    console.log(`✓ ${m.label} (${m.children?.length ?? 0} hijos) cat=${id_categoria ?? "—"}`);
  }

  console.log("Seed menú completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
