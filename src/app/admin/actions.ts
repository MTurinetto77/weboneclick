"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile, saveUploadedFile } from "@/lib/uploads";
import { slugify } from "@/lib/slug";

async function guard() {
  await requireAdmin();
}

function revalidateCatalog() {
  revalidateTag("products", { expire: 0 });
  revalidateTag("categories", { expire: 0 });
}

async function uniqueProductoSlug(base: string, excludeId?: number) {
  let slug = slugify(base) || `producto-${Date.now()}`;
  const slugRoot = slug;
  let i = 2;
  while (true) {
    const existing = await prisma.producto.findUnique({ where: { slug } });
    if (!existing || existing.id_producto === excludeId) return slug;
    slug = `${slugRoot}-${i++}`;
  }
}

export async function createProducto(formData: FormData) {
  await guard();
  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const precio = Number(formData.get("precio") || 0);
  const categoriaIds = formData.getAll("categorias").map(Number).filter(Boolean);
  const slugInput = String(formData.get("slug") || "").trim();

  if (!titulo) throw new Error("Título requerido");

  const slug = await uniqueProductoSlug(slugInput || titulo);

  const product = await prisma.producto.create({
    data: {
      titulo,
      slug,
      descripcion,
      activo: true,
      precios: precio
        ? {
            create: {
              fecha_desde: new Date(),
              precio,
            },
          }
        : undefined,
      categorias: categoriaIds.length
        ? { create: categoriaIds.map((id_categoria) => ({ id_categoria })) }
        : undefined,
    },
  });

  revalidateCatalog();
  revalidatePath("/admin/productos");
  revalidatePath("/shop");
  redirect(`/admin/productos/${product.id_producto}`);
}

export async function updateProducto(id_producto: number, formData: FormData) {
  await guard();
  const existing = await prisma.producto.findUnique({
    where: { id_producto },
    select: { slug: true },
  });
  if (!existing) throw new Error("Producto no encontrado");

  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const activo = formData.get("activo") === "on";
  const categoriaIds = formData.getAll("categorias").map(Number).filter(Boolean);
  const slugInput = String(formData.get("slug") || "").trim();
  const slug = await uniqueProductoSlug(slugInput || existing.slug || titulo, id_producto);
  const descuentoRaw = String(formData.get("descuento_general") || "").trim();
  let descuento_general: number | null = null;
  if (descuentoRaw !== "") {
    const n = Number(descuentoRaw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error("Descuento general inválido (0–100)");
    }
    descuento_general = n > 0 ? Math.round(n * 100) / 100 : null;
  }

  await prisma.$transaction([
    prisma.categoria_producto.deleteMany({ where: { id_producto } }),
    prisma.producto.update({
      where: { id_producto },
      data: {
        titulo,
        slug,
        descripcion,
        activo,
        descuento_general,
        categorias: {
          create: categoriaIds.map((id_categoria) => ({ id_categoria })),
        },
      },
    }),
  ]);

  revalidateCatalog();
  revalidatePath(`/admin/productos/${id_producto}`);
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/${id_producto}`);
  revalidatePath(`/producto/${slug}`);
  if (existing.slug && existing.slug !== slug) {
    revalidatePath(`/producto/${existing.slug}`);
  }
}

export async function addPrecio(id_producto: number, formData: FormData) {
  await guard();
  const precio = Number(formData.get("precio"));
  const fecha = String(formData.get("fecha_desde") || new Date().toISOString().slice(0, 10));
  if (!precio) throw new Error("Precio inválido");

  await prisma.precio_producto.upsert({
    where: {
      id_producto_fecha_desde: {
        id_producto,
        fecha_desde: new Date(fecha),
      },
    },
    create: {
      id_producto,
      fecha_desde: new Date(fecha),
      precio,
    },
    update: { precio },
  });

  revalidatePath(`/admin/productos/${id_producto}`);
  revalidatePath(`/catalogo/${id_producto}`);
}

export async function upsertStock(id_producto: number, formData: FormData) {
  await guard();
  const id_almacen = Number(formData.get("id_almacen"));
  const cantidad = Number(formData.get("cantidad"));
  if (!id_almacen) throw new Error("Almacén requerido");

  await prisma.stock.upsert({
    where: {
      id_producto_id_almacen: { id_producto, id_almacen },
    },
    create: { id_producto, id_almacen, cantidad },
    update: { cantidad },
  });

  revalidatePath(`/admin/productos/${id_producto}`);
}

export async function upsertCaracteristicaProducto(id_producto: number, formData: FormData) {
  await guard();
  const id_caracteristica = Number(formData.get("id_caracteristica"));
  const valor = String(formData.get("valor") || "").trim();
  const valor_numerico = formData.get("valor_numerico") === "on";
  if (!id_caracteristica || !valor) throw new Error("Datos incompletos");

  await prisma.producto_caracteristica.upsert({
    where: {
      id_producto_id_caracteristica: { id_producto, id_caracteristica },
    },
    create: { id_producto, id_caracteristica, valor, valor_numerico },
    update: { valor, valor_numerico },
  });

  revalidatePath(`/admin/productos/${id_producto}`);
}

export async function deleteCaracteristicaProducto(
  id_producto: number,
  id_caracteristica: number
) {
  await guard();
  await prisma.producto_caracteristica.delete({
    where: {
      id_producto_id_caracteristica: { id_producto, id_caracteristica },
    },
  });
  revalidatePath(`/admin/productos/${id_producto}`);
  revalidatePath(`/catalogo/${id_producto}`);
}

function descripcionDesdeNombreArchivo(name: string) {
  const base = name.replace(/^.*[\\/]/, "").trim();
  const sinExt = base.replace(/\.[^.]+$/, "");
  return (sinExt || base || "Imagen producto").slice(0, 255);
}

export async function uploadProductoImagen(id_producto: number, formData: FormData) {
  await guard();
  const files = formData
    .getAll("imagen")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }));
  if (files.length === 0) throw new Error("Archivo requerido");

  const descripcionForm = String(formData.get("descripcion") || "").trim();
  const multiple = files.length > 1;

  for (const file of files) {
    const link = await saveUploadedFile(file);
    const descripcion = multiple
      ? descripcionDesdeNombreArchivo(file.name)
      : descripcionForm || descripcionDesdeNombreArchivo(file.name) || "Imagen producto";
    const archivo = await prisma.archivo.create({
      data: {
        link,
        tipo: "imagen_principal",
        descripcion,
      },
    });
    await prisma.archivo_producto.create({
      data: { id_archivo: archivo.id_archivo, id_producto },
    });
  }

  const producto = await prisma.producto.findUnique({
    where: { id_producto },
    select: { slug: true },
  });
  revalidateCatalog();
  revalidatePath(`/admin/productos/${id_producto}`);
  revalidatePath(`/catalogo/${id_producto}`);
  if (producto?.slug) revalidatePath(`/producto/${producto.slug}`);
  revalidatePath("/", "layout");
}

export async function deleteProductoImagen(id_producto: number, id_archivo: number) {
  await guard();
  const archivo = await prisma.archivo.findUnique({ where: { id_archivo } });
  await prisma.archivo_producto.deleteMany({ where: { id_archivo, id_producto } });
  await prisma.archivo.delete({ where: { id_archivo } });
  if (archivo) await deleteUploadedFile(archivo.link);
  revalidatePath(`/admin/productos/${id_producto}`);
}

export async function createCategoria(formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  const nivel = Number(formData.get("nivel") || 1);
  const superior = formData.get("id_cat_superior");
  const id_cat_superior = superior ? Number(superior) : null;
  if (!nombre) throw new Error("Nombre requerido");

  const slugBase = slugify(nombre) || `categoria-${Date.now()}`;
  let slug = slugBase;
  let i = 2;
  while (await prisma.categoria.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${i++}`;
  }

  const categoria = await prisma.categoria.create({
    data: {
      nombre,
      slug,
      nivel,
      id_cat_superior: id_cat_superior || null,
    },
  });
  revalidateCatalog();
  revalidatePath("/admin/categorias");
  revalidatePath("/shop");
  redirect(`/admin/categorias/${categoria.id_categoria}`);
}

export async function updateCategoria(id_categoria: number, formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  const nivel = Number(formData.get("nivel") || 1);
  const superior = formData.get("id_cat_superior");
  const id_cat_superior = superior ? Number(superior) : null;
  const caracteristicaIds = formData.getAll("caracteristicas").map(Number).filter(Boolean);

  await prisma.$transaction([
    prisma.caracteristica_categoria.deleteMany({ where: { id_categoria } }),
    prisma.categoria.update({
      where: { id_categoria },
      data: {
        nombre,
        nivel,
        id_cat_superior: id_cat_superior || null,
        caracteristicas: {
          create: caracteristicaIds.map((id_caracteristica) => ({ id_caracteristica })),
        },
      },
    }),
  ]);

  revalidateCatalog();
  revalidatePath("/admin/categorias");
  revalidatePath(`/admin/categorias/${id_categoria}`);
  revalidatePath("/catalogo");
}

export async function deleteCategoria(id_categoria: number) {
  await guard();
  await prisma.categoria.delete({ where: { id_categoria } });
  revalidateCatalog();
  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
  redirect("/admin/categorias");
}

export async function createAlmacen(formData: FormData) {
  await guard();
  const descripcion = String(formData.get("descripcion") || "").trim();
  if (!descripcion) throw new Error("Descripción requerida");
  await prisma.almacen.create({ data: { descripcion } });
  revalidatePath("/admin/almacenes");
}

export async function updateAlmacen(id_almacen: number, formData: FormData) {
  await guard();
  const descripcion = String(formData.get("descripcion") || "").trim();
  await prisma.almacen.update({ where: { id_almacen }, data: { descripcion } });
  revalidatePath("/admin/almacenes");
}

export async function deleteAlmacen(id_almacen: number) {
  await guard();
  const productosAsociados = await prisma.stock.count({
    where: { id_almacen },
  });
  if (productosAsociados > 0) {
    throw new Error(
      `No se puede eliminar: hay ${productosAsociados} producto(s) con stock en este almacén.`
    );
  }
  await prisma.almacen.delete({ where: { id_almacen } });
  revalidatePath("/admin/almacenes");
}

export async function createCaracteristica(formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  if (!nombre) throw new Error("Nombre requerido");
  const item = await prisma.caracteristica.create({ data: { nombre } });
  revalidatePath("/admin/caracteristicas");
  redirect(`/admin/caracteristicas/${item.id_caracteristica}`);
}

export async function updateCaracteristica(id_caracteristica: number, formData: FormData) {
  await guard();
  const nombre = String(formData.get("nombre") || "").trim();
  await prisma.caracteristica.update({ where: { id_caracteristica }, data: { nombre } });
  revalidatePath("/admin/caracteristicas");
  revalidatePath(`/admin/caracteristicas/${id_caracteristica}`);
}

export async function deleteCaracteristica(id_caracteristica: number) {
  await guard();
  const productosAsociados = await prisma.producto_caracteristica.count({
    where: { id_caracteristica },
  });
  if (productosAsociados > 0) {
    throw new Error(
      `No se puede eliminar: hay ${productosAsociados} producto(s) con esta característica.`
    );
  }
  await prisma.caracteristica.delete({ where: { id_caracteristica } });
  revalidatePath("/admin/caracteristicas");
  redirect("/admin/caracteristicas");
}

export async function createUsuario(formData: FormData) {
  await guard();
  const data = userFromForm(formData);
  await prisma.usuario.create({ data });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

export async function updateUsuario(id_usuario: number, formData: FormData) {
  await guard();
  const data = userFromForm(formData);
  await prisma.usuario.update({ where: { id_usuario }, data });
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id_usuario}`);
}

function userFromForm(formData: FormData) {
  return {
    mail: String(formData.get("mail") || "").trim().toLowerCase(),
    tipo_usuario: String(formData.get("tipo_usuario") || "cliente"),
    activo: formData.get("activo") === "on",
  };
}

const PCT_HEADER_RE =
  /^(poc_descuento|pct_descuento|descuento_general|descuento|porcentaje)$/i;

function parseCsvCells(line: string): string[] {
  return line
    .split(/[,;\t]/)
    .map((c) => c.trim().replace(/^["']|["']$/g, ""));
}

/**
 * CSV con columnas `sku` + `poc_descuento` (también acepta pct_descuento /
 * descuento_general / descuento). Sin encabezado: col0=sku, col1=%.
 * Última fila gana si el SKU se repite.
 */
function parseDescuentoGeneralCsv(
  text: string,
): { sku: string; pct: number }[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const header = parseCsvCells(lines[0]);
  let skuIdx = header.findIndex((c) => /^sku$/i.test(c));
  let pctIdx = header.findIndex((c) => PCT_HEADER_RE.test(c));
  let start = 0;
  if (skuIdx >= 0 && pctIdx >= 0) {
    start = 1;
  } else {
    skuIdx = 0;
    pctIdx = 1;
  }

  const bySku = new Map<string, number>();
  for (let i = start; i < lines.length; i++) {
    const cells = parseCsvCells(lines[i]);
    const sku = (cells[skuIdx] || "").trim();
    const raw = (cells[pctIdx] || "").trim().replace(",", ".");
    if (!sku || raw === "") continue;
    const pct = Number(raw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) continue;
    bySku.set(sku, pct);
  }
  return [...bySku.entries()].map(([sku, pct]) => ({ sku, pct }));
}

/** Importa CSV sku + poc_descuento → producto.descuento_general. 0 → null. */
export async function importDescuentoGeneralCsv(formData: FormData) {
  await guard();

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/productos?dg_err=archivo");
  }

  const text = await file.text();
  const rows = parseDescuentoGeneralCsv(text);
  if (!rows.length) {
    redirect("/admin/productos?dg_err=vacio");
  }

  const skus = rows.map((r) => r.sku);
  const productos = await prisma.producto.findMany({
    where: { sku: { in: skus } },
    select: { id_producto: true, sku: true, slug: true },
  });

  const bySku = new Map(
    productos
      .filter((p): p is { id_producto: number; sku: string; slug: string } =>
        Boolean(p.sku),
      )
      .map((p) => [p.sku, p]),
  );
  const bySkuLower = new Map(
    [...bySku.entries()].map(([sku, p]) => [sku.toLowerCase(), p]),
  );

  const missing: string[] = [];
  /** id_producto → valor a persistir (null = quitar descuento) */
  const updates = new Map<number, number | null>();
  const slugsToRevalidate = new Set<string>();

  for (const row of rows) {
    const product =
      bySku.get(row.sku) ?? bySkuLower.get(row.sku.toLowerCase());
    if (!product) {
      missing.push(row.sku);
      continue;
    }
    // 0 → null: deja de aplicar (misma regla que el form de producto)
    const value =
      row.pct > 0 ? Math.round(row.pct * 100) / 100 : null;
    updates.set(product.id_producto, value);
    if (product.slug) slugsToRevalidate.add(product.slug);
  }

  if (updates.size) {
    await prisma.$transaction(
      [...updates.entries()].map(([id_producto, descuento_general]) =>
        prisma.producto.update({
          where: { id_producto },
          data: { descuento_general },
        }),
      ),
    );
  }

  revalidateCatalog();
  revalidatePath("/admin/productos");
  for (const slug of slugsToRevalidate) {
    revalidatePath(`/producto/${slug}`);
  }

  const cleared = [...updates.values()].filter((v) => v == null).length;
  const applied = updates.size - cleared;
  const params = new URLSearchParams({
    dg_ok: String(updates.size),
    dg_applied: String(applied),
    dg_cleared: String(cleared),
    dg_missing: String(missing.length),
  });
  if (missing.length) {
    params.set("dg_miss_list", missing.slice(0, 15).join(","));
  }
  redirect(`/admin/productos?${params.toString()}`);
}

