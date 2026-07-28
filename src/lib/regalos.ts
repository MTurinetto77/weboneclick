import { prisma } from "@/lib/prisma";
import { uploadPublicUrl } from "@/lib/utils";

export type RegaloProductoOption = {
  id_producto: number;
  titulo: string;
  sku: string | null;
  imagen: string | null;
  odoo_id: number | null;
};

export type RegaloApplicable = {
  id_regalo: number;
  nombre: string;
  monto_minimo: number;
  productos: RegaloProductoOption[];
};

function isVigente(
  desde: Date,
  hasta: Date | null,
  now: Date,
): boolean {
  if (desde > now) return false;
  if (hasta && hasta < now) return false;
  return true;
}

/**
 * Regalo activo vigente cuyo monto_minimo es el mayor entre los que aplica
 * al subtotal (si empatan, el más reciente).
 */
export async function getRegaloApplicable(
  subtotal: number,
  now = new Date(),
): Promise<RegaloApplicable | null> {
  if (!(subtotal > 0) || !Number.isFinite(subtotal)) return null;

  const candidates = await prisma.regalo.findMany({
    where: {
      activo: true,
      monto_minimo: { lte: subtotal },
      vigencia_desde: { lte: now },
      OR: [{ vigencia_hasta: null }, { vigencia_hasta: { gte: now } }],
    },
    include: {
      productos: {
        include: {
          producto: {
            select: {
              id_producto: true,
              titulo: true,
              sku: true,
              odoo_id: true,
              activo: true,
              archivos: {
                where: { archivo: { tipo: "imagen_principal" } },
                take: 1,
                select: { archivo: { select: { link: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: [{ monto_minimo: "desc" }, { fecha_creacion: "desc" }],
  });

  const regalo = candidates.find((r) => isVigente(r.vigencia_desde, r.vigencia_hasta, now));
  if (!regalo) return null;

  const productos = regalo.productos
    .filter((row) => row.producto.activo)
    .map((row) => {
      const link = row.producto.archivos[0]?.archivo.link ?? null;
      return {
        id_producto: row.producto.id_producto,
        titulo: row.producto.titulo,
        sku: row.producto.sku,
        odoo_id: row.producto.odoo_id,
        imagen: link ? uploadPublicUrl(link) : null,
      };
    });

  if (!productos.length) return null;

  return {
    id_regalo: regalo.id_regalo,
    nombre: regalo.nombre,
    monto_minimo: Number(regalo.monto_minimo),
    productos,
  };
}

/** Valida que el producto elegido pertenezca al regalo aplicable al subtotal. */
export async function resolveSelectedRegaloProducto(
  subtotal: number,
  idProductoRegalo: number | null,
): Promise<RegaloProductoOption | null> {
  const regalo = await getRegaloApplicable(subtotal);
  if (!regalo) {
    if (idProductoRegalo) {
      throw new Error("El carrito ya no califica para un regalo");
    }
    return null;
  }

  if (!idProductoRegalo || idProductoRegalo <= 0) {
    throw new Error("Elegí tu regalo para continuar");
  }

  const selected = regalo.productos.find((p) => p.id_producto === idProductoRegalo);
  if (!selected) {
    throw new Error("El regalo seleccionado no es válido para esta promoción");
  }

  return selected;
}
