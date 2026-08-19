import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { MAIN_NAV, type NavItem } from "./nav";

export const getMainNav = unstable_cache(
  async (): Promise<NavItem[]> => {
    const items = await prisma.menu_item.findMany({
      where: { activo: true },
      orderBy: { orden: "asc" },
      include: {
        hijos: {
          where: { activo: true },
          orderBy: { orden: "asc" },
        },
      },
    });
    if (items.length === 0) return MAIN_NAV;
    return items.map((it) => ({
      label: it.label,
      href: it.href,
      shopLabel: it.shop_label ?? undefined,
      dynamicChildren: it.dynamic_children as "promociones" | undefined,
      badge: it.badge ?? undefined,
      children: it.hijos.map((h) => ({
        label: h.label,
        href: h.href,
        badge: h.badge ?? undefined,
        icon: h.icon ?? undefined,
        variant: (h.variant as "product" | "link") ?? "product",
      })),
    }));
  },
  ["main-nav"],
  { tags: ["main-nav"], revalidate: 3600 },
);
