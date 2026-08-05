import type { MailAttachment } from "@/lib/mail";

export const CONTACT_FORM_IDS = [
  "empresas",
  "servicio-tecnico",
  "alta-proveedor",
  "aviso-stock",
  "cambio-facturacion",
  "libro-quejas",
  "garantia",
  "arrepentimiento",
  "newsletter",
] as const;

export type ContactFormId = (typeof CONTACT_FORM_IDS)[number];

export function isContactFormId(value: string): value is ContactFormId {
  return (CONTACT_FORM_IDS as readonly string[]).includes(value);
}

const INFO = "info@oneclickstore.com";
const CORPORATIVO = "corporativo@oneclickstore.com";

/** Destinatario de servicio técnico según la tienda elegida en el formulario. */
const SERVICIO_TECNICO_MAIL_BY_TIENDA: Record<string, string> = {
  "Palermo Soho": "rep.ps@oneclickstore.com",
  "Dot Baires Shopping": "rep.dot@oneclickstore.com",
  "Córdoba Shopping": "Rep.cs@oneclickstore.com",
  "Rosario Centro": "Rep.rc@oneclickstore.com",
  "Alto Rosario": "Rep.ar@oneclickstore.com",
  "Solar Shopping": "rep.sol@oneclickstore.com",
};

function servicioTecnicoTo(tienda: string): string | null {
  return SERVICIO_TECNICO_MAIL_BY_TIENDA[tienda] ?? null;
}

export type ContactPayload = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
};

type FieldMap = Record<string, string>;

function req(fields: FieldMap, keys: string[]): string | null {
  for (const key of keys) {
    if (!fields[key]?.trim()) return `Falta el campo: ${key}`;
  }
  return null;
}

function emailOk(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function line(label: string, value: string): string {
  return `${label}: ${value}`;
}

export const MAX_GARANTIA_FILES = 5;
export const MAX_GARANTIA_TOTAL_BYTES = 8 * 1024 * 1024;

export async function buildContactPayload(
  form: ContactFormId,
  fields: FieldMap,
  files: File[],
): Promise<{ ok: true; payload: ContactPayload } | { ok: false; error: string }> {
  const get = (k: string) => (fields[k] || "").trim();

  switch (form) {
    case "empresas": {
      const missing = req(fields, ["nombre", "empresa", "email", "telefono", "mensaje"]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      return {
        ok: true,
        payload: {
          to: CORPORATIVO,
          subject: "Consulta Empresas OneClick",
          replyTo: get("email"),
          text: [
            line("Nombre y Apellido", get("nombre")),
            line("Empresa", get("empresa")),
            line("Email", get("email")),
            line("Teléfono", get("telefono")),
            "",
            "Mensaje:",
            get("mensaje"),
          ].join("\n"),
        },
      };
    }

    case "servicio-tecnico": {
      const missing = req(fields, ["nombre", "telefono", "email", "entrega", "tienda", "modelo", "falla"]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      const tienda = get("tienda");
      const to = servicioTecnicoTo(tienda);
      if (!to) return { ok: false, error: "Tienda inválida" };
      const dispositivos = get("dispositivo")
        ? get("dispositivo").split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      return {
        ok: true,
        payload: {
          to,
          subject: `Solicitud Servicio Técnico OneClick — ${tienda}`,
          replyTo: get("email"),
          text: [
            line("Nombre", get("nombre")),
            line("Teléfono", get("telefono")),
            line("Email", get("email")),
            line("Tipo de entrega", get("entrega")),
            line("Tienda", tienda),
            line("Dispositivo(s)", dispositivos.join(", ") || "—"),
            line("Modelo", get("modelo")),
            line("Nº de serie", get("serie") || "—"),
            "",
            "Detalle de la falla:",
            get("falla"),
          ].join("\n"),
        },
      };
    }

    case "alta-proveedor": {
      const missing = req(fields, [
        "razon_social",
        "calle",
        "altura",
        "provincia",
        "cp",
        "pais",
        "telefono",
        "email_pago",
        "metodo_pago",
        "cuit",
        "iva",
        "ganancias",
        "iibb",
        "exclusion",
        "banco",
        "titular",
        "cbu",
        "nro_cuenta",
      ]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email_pago"))) return { ok: false, error: "Email inválido" };
      return {
        ok: true,
        payload: {
          to: INFO,
          subject: "Alta de Proveedor OneClick",
          replyTo: get("email_pago"),
          text: [
            "ALTA DE PROVEEDOR — OneClick",
            "",
            "Datos Generales",
            line("Razón social", get("razon_social")),
            line("Calle", get("calle")),
            line("Altura", get("altura")),
            line("Provincia", get("provincia")),
            line("CP", get("cp")),
            line("País", get("pais")),
            line("Teléfono", get("telefono")),
            line("Email pago", get("email_pago")),
            line("Método de pago", get("metodo_pago")),
            "",
            "Información Impositiva",
            line("CUIT", get("cuit")),
            line("IVA", get("iva")),
            line("Ganancias", get("ganancias")),
            line("IIBB", get("iibb")),
            line("Nro inscripción", get("nro_inscripcion") || "—"),
            line("Certificación exclusión", get("exclusion")),
            "",
            "Datos Bancarios",
            line("Banco", get("banco")),
            line("Titular", get("titular")),
            line("CBU", get("cbu")),
            line("Nro cuenta", get("nro_cuenta")),
          ].join("\n"),
        },
      };
    }

    case "aviso-stock": {
      const missing = req(fields, ["email", "productTitle"]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      const title = get("productTitle");
      return {
        ok: true,
        payload: {
          to: INFO,
          subject: `Aviso de stock: ${title}`,
          replyTo: get("email"),
          text: [
            "Quiero que me avisen cuando este producto vuelva a estar disponible.",
            "",
            line("Producto", title),
            get("productSku") ? line("SKU", get("productSku")) : null,
            line("Email", get("email")),
          ]
            .filter(Boolean)
            .join("\n"),
        },
      };
    }

    case "cambio-facturacion": {
      const missing = req(fields, ["nombre", "telefono", "email", "tipo", "fecha", "importe"]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      return {
        ok: true,
        payload: {
          to: INFO,
          subject: "Solicitud Cambio de Facturación",
          replyTo: get("email"),
          text: [
            line("Nombre", get("nombre")),
            line("Teléfono", get("telefono")),
            line("Email", get("email")),
            line("Tipo de cambio", get("tipo")),
            line("Nro Factura B", get("nro_b") || "—"),
            line("Nro Factura A", get("nro_a") || "—"),
            line("Fecha comprobante", get("fecha")),
            line("Importe", get("importe")),
            line("CUIT", get("cuit") || "—"),
            line("DNI", get("dni") || "—"),
            "",
            "Observaciones:",
            get("observaciones") || "—",
          ].join("\n"),
        },
      };
    }

    case "libro-quejas": {
      const missing = req(fields, ["nombre", "telefono", "email", "canal", "detalle"]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      return {
        ok: true,
        payload: {
          to: INFO,
          subject: "Libro de Quejas y Reclamos OneClick",
          replyTo: get("email"),
          text: [
            line("Nombre", get("nombre")),
            line("Teléfono", get("telefono")),
            line("Email", get("email")),
            line("Canal", get("canal")),
            "",
            "Detalle:",
            get("detalle"),
          ].join("\n"),
        },
      };
    }

    case "garantia": {
      const missing = req(fields, [
        "nombre",
        "telefono",
        "email",
        "tienda",
        "nrofactura",
        "fechacomp",
        "canal",
        "detalle",
      ]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      if (!files.length) return { ok: false, error: "Adjuntá al menos una foto del producto" };
      if (files.length > MAX_GARANTIA_FILES) {
        return { ok: false, error: `Máximo ${MAX_GARANTIA_FILES} archivos` };
      }

      let total = 0;
      const attachments: MailAttachment[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          return { ok: false, error: "Solo se permiten imágenes" };
        }
        total += file.size;
        if (total > MAX_GARANTIA_TOTAL_BYTES) {
          return { ok: false, error: "Los archivos superan el límite de 8 MB" };
        }
        const buf = Buffer.from(await file.arrayBuffer());
        attachments.push({
          filename: file.name || "foto.jpg",
          content: buf,
          contentType: file.type,
        });
      }

      return {
        ok: true,
        payload: {
          to: INFO,
          subject: "Solicitud Garantía Post Venta OneClick",
          replyTo: get("email"),
          text: [
            line("Nombre", get("nombre")),
            line("Teléfono", get("telefono")),
            line("Email", get("email")),
            line("Tienda", get("tienda")),
            line("Nro factura", get("nrofactura")),
            line("Fecha comprobante", get("fechacomp")),
            line("Canal", get("canal")),
            "",
            "Detalle de la falla:",
            get("detalle"),
            "",
            `Adjuntos: ${attachments.length}`,
          ].join("\n"),
          attachments,
        },
      };
    }

    case "arrepentimiento": {
      const missing = req(fields, [
        "nombre",
        "telefono",
        "email",
        "tipocambio",
        "nrofactura",
        "fechacomp",
        "importefinal",
      ]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      return {
        ok: true,
        payload: {
          to: INFO,
          subject: "Botón de Arrepentimiento / Devolución OneClick",
          replyTo: get("email"),
          text: [
            line("Nombre", get("nombre")),
            line("Teléfono", get("telefono")),
            line("Email", get("email")),
            line("Motivo", get("tipocambio")),
            line("Nro factura", get("nrofactura")),
            line("Fecha comprobante", get("fechacomp")),
            line("Importe", get("importefinal")),
            "",
            "Detalles:",
            get("detalles") || "—",
          ].join("\n"),
        },
      };
    }

    case "newsletter": {
      const missing = req(fields, ["email"]);
      if (missing) return { ok: false, error: missing };
      if (!emailOk(get("email"))) return { ok: false, error: "Email inválido" };
      return {
        ok: true,
        payload: {
          to: INFO,
          subject: "Suscripción Newsletter OneClick",
          replyTo: get("email"),
          text: [`Nueva suscripción al newsletter.`, "", line("Email", get("email"))].join("\n"),
        },
      };
    }

    default:
      return { ok: false, error: "Formulario desconocido" };
  }
}
