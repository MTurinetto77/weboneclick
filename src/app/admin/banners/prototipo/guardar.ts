"use server";

/**
 * Guardado del editor visual (PROTOTIPO).
 *
 * Escribe en la tabla `banner` que ya existe: el HTML generado va al campo
 * `html` y los fondos a `imagen_desktop` / `imagen_mobile`. No hace falta
 * ninguna columna nueva, y el render de la home queda igual que siempre.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { isBannerUbicacion } from "@/lib/banners";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile } from "@/lib/uploads";

export type BannerResumen = {
  id_banner: number;
  titulo: string;
  ubicacion: string;
  orden: number;
  activo: boolean;
  /** Si lo hizo este editor, se puede reabrir tal cual quedó. */
  delEditor: boolean;
};

export type BannerCargado = {
  titulo: string;
  ubicacion: string;
  orden: number;
  activo: boolean;
  vigencia_desde: string;
  vigencia_hasta: string;
  html: string;
  imagen_desktop: string;
  imagen_mobile: string;
};

export type DatosGuardado = {
  /** null = crear uno nuevo. */
  id_banner: number | null;
  titulo: string;
  ubicacion: string;
  orden: number;
  activo: boolean;
  vigencia_desde: string;
  vigencia_hasta: string;
  html: string;
  fondoDesktop: string;
  fondoMobile: string;
};

export type Resultado =
  | { ok: true; id_banner: number; creado: boolean; htmlAnterior: string | null }
  | { ok: false; error: string };

function revalidar(id?: number) {
  revalidatePath("/admin/banners");
  revalidatePath("/");
  if (id) revalidatePath(`/admin/banners/${id}`);
}

function fecha(valor: string, porDefecto: Date | null = null) {
  const v = (valor || "").trim();
  if (!v) return porDefecto;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? porDefecto : d;
}

/** Listado para el desplegable de destino. */
export async function listarBanners(): Promise<BannerResumen[]> {
  await requireAdmin();
  const rows = await prisma.banner.findMany({
    orderBy: [{ ubicacion: "asc" }, { orden: "asc" }, { id_banner: "asc" }],
    select: {
      id_banner: true,
      titulo: true,
      ubicacion: true,
      orden: true,
      activo: true,
      html: true,
    },
  });
  return rows.map((r) => ({
    id_banner: r.id_banner,
    titulo: r.titulo,
    ubicacion: r.ubicacion,
    orden: r.orden,
    activo: r.activo,
    delEditor: !!r.html && r.html.includes("data-oc-doc"),
  }));
}

/** Trae un banner para seguir editándolo. */
export async function cargarBanner(id_banner: number): Promise<BannerCargado | null> {
  await requireAdmin();
  const b = await prisma.banner.findUnique({ where: { id_banner } });
  if (!b) return null;
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : "");
  return {
    titulo: b.titulo,
    ubicacion: b.ubicacion,
    orden: b.orden,
    activo: b.activo,
    vigencia_desde: iso(b.vigencia_desde),
    vigencia_hasta: iso(b.vigencia_hasta),
    html: b.html ?? "",
    imagen_desktop: b.imagen_desktop ?? "",
    imagen_mobile: b.imagen_mobile ?? "",
  };
}

/** Sube un fondo y devuelve la ruta relativa que guarda la base. */
export async function subirFondo(formData: FormData): Promise<{ ok: true; ruta: string } | { ok: false; error: string }> {
  await requireAdmin();
  const file = formData.get("archivo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No llegó ningún archivo" };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: "La imagen supera los 8 MB" };
  }
  try {
    const ruta = await saveUploadedFile(file, "banners");
    return { ok: true, ruta };
  } catch {
    return { ok: false, error: "No se pudo guardar la imagen" };
  }
}

/**
 * Crea o actualiza el banner. Devuelve el HTML anterior para poder deshacer
 * si el cambio no era el esperado.
 */
export async function guardarBanner(datos: DatosGuardado): Promise<Resultado> {
  await requireAdmin();

  const titulo = (datos.titulo || "").trim();
  if (!titulo) return { ok: false, error: "Poné un título para identificar el banner" };

  if (!isBannerUbicacion(datos.ubicacion)) {
    return { ok: false, error: "Ubicación inválida" };
  }

  const fondoDesktop = (datos.fondoDesktop || "").trim();
  if (!fondoDesktop) {
    return {
      ok: false,
      error:
        "Falta el fondo de desktop. La home lo necesita como imagen del banner: cargalo en el panel Fondo.",
    };
  }
  if (fondoDesktop.startsWith("blob:")) {
    return { ok: false, error: "El fondo de desktop no terminó de subirse. Probá de nuevo." };
  }
  const fondoMobile = (datos.fondoMobile || "").trim();
  if (fondoMobile.startsWith("blob:")) {
    return { ok: false, error: "El fondo de mobile no terminó de subirse. Probá de nuevo." };
  }

  const html = (datos.html || "").trim();
  if (!html) return { ok: false, error: "El diseño está vacío" };

  const desde = fecha(datos.vigencia_desde, new Date());
  const hasta = fecha(datos.vigencia_hasta, null);
  if (hasta && desde && hasta < desde) {
    return { ok: false, error: "La vigencia hasta es anterior a la vigencia desde" };
  }

  const orden = Number.isFinite(datos.orden) ? Math.trunc(datos.orden) : 0;

  try {
    if (datos.id_banner == null) {
      const creado = await prisma.banner.create({
        data: {
          titulo,
          imagen_desktop: fondoDesktop,
          imagen_mobile: fondoMobile || null,
          ubicacion: datos.ubicacion,
          orden,
          vigencia_desde: desde!,
          vigencia_hasta: hasta,
          activo: datos.activo,
          html,
        },
      });
      revalidar(creado.id_banner);
      return { ok: true, id_banner: creado.id_banner, creado: true, htmlAnterior: null };
    }

    const previo = await prisma.banner.findUnique({ where: { id_banner: datos.id_banner } });
    if (!previo) return { ok: false, error: "Ese banner ya no existe" };

    await prisma.banner.update({
      where: { id_banner: datos.id_banner },
      data: {
        titulo,
        imagen_desktop: fondoDesktop,
        imagen_mobile: fondoMobile || null,
        ubicacion: datos.ubicacion,
        orden,
        vigencia_desde: desde!,
        vigencia_hasta: hasta,
        activo: datos.activo,
        html,
        // clase_css se deja como estaba: el diseño ahora lo define el HTML.
      },
    });
    revalidar(datos.id_banner);
    return { ok: true, id_banner: datos.id_banner, creado: false, htmlAnterior: previo.html };
  } catch {
    return { ok: false, error: "No se pudo guardar. Revisá la conexión con la base." };
  }
}

/** Vuelve atrás el último guardado sobre un banner existente. */
export async function deshacerHtml(id_banner: number, htmlAnterior: string | null): Promise<Resultado> {
  await requireAdmin();
  try {
    const previo = await prisma.banner.findUnique({ where: { id_banner } });
    if (!previo) return { ok: false, error: "Ese banner ya no existe" };
    await prisma.banner.update({
      where: { id_banner },
      data: { html: htmlAnterior },
    });
    revalidar(id_banner);
    return { ok: true, id_banner, creado: false, htmlAnterior: previo.html };
  } catch {
    return { ok: false, error: "No se pudo deshacer" };
  }
}
