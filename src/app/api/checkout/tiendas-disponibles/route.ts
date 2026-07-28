import { NextResponse } from "next/server";
import { cartHasStockInWarehouse, resolveCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/checkout/tiendas-disponibles — tiendas con stock del carrito actual */
export async function GET() {
  const cart = await resolveCart();
  if (!cart.items.length) {
    return NextResponse.json({ tiendas: [], ningunaDisponible: true });
  }

  const tiendas = await prisma.tienda.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: {
      almacenes: {
        where: { odoo_id: { not: null } },
        select: { id_almacen: true, odoo_id: true },
        take: 1,
      },
    },
  });

  const result = tiendas.map((t) => {
    const odooId = t.almacenes[0]?.odoo_id ?? null;
    const disponible =
      odooId != null && cartHasStockInWarehouse(cart.items, odooId);
    return {
      id_tienda: t.id_tienda,
      nombre: t.nombre,
      slug: t.slug,
      direccion: t.direccion_corta ?? t.direccion,
      localidad: t.localidad,
      provincia: t.provincia,
      horarios: t.horarios,
      odoo_warehouse_id: odooId,
      disponible,
    };
  });

  const disponibles = result.filter((t) => t.disponible);

  return NextResponse.json({
    tiendas: result,
    disponibles,
    ningunaDisponible: disponibles.length === 0,
  });
}
