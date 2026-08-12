/**
 * Armado de payer / additional_info / shipments para Mercado Pago
 * (preference + Payments API) para mejorar aprobación antifraude.
 */

export type MpAddress = {
  street_name: string;
  street_number: string;
  floor?: string | null;
  apartment?: string | null;
  zip_code?: string | null;
  city: string;
  federal_unit: string;
  neighborhood?: string | null;
};

export type MpPayerSource = {
  nombre: string;
  apellido: string;
  mail: string;
  telefono?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  /** "google" | "invitado" | otros */
  checkout_mode?: string | null;
  tipo_entrega?: string | null;
  address_billing?: MpAddress | null;
  address_shipping?: MpAddress | null;
  itemsCobro: {
    id_producto: number;
    titulo: string;
    cantidad: number;
    unit_price: number;
  }[];
  costo_envio: number;
};

function digitsOnly(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "");
}

/** DNI / CUIT / CUIL según documento del checkout. */
export function mpIdentification(
  tipo: string | null | undefined,
  numero: string | null | undefined,
): { type: string; number: string } | undefined {
  const number = digitsOnly(numero);
  if (!number) return undefined;
  const t = (tipo || "").toUpperCase();
  const type =
    t === "CUIT" || t === "CUIL" ? t : t === "DNI" || !t ? "DNI" : t;
  return { type, number };
}

/** Teléfono AR → area_code + number (best-effort). */
export function mpPhone(
  telefono: string | null | undefined,
): { area_code: string; number: string } | undefined {
  let d = digitsOnly(telefono);
  if (!d) return undefined;
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9") && d.length > 10) d = d.slice(1);
  if (d.length < 6) return undefined;
  // Móviles AMBA: 11 + 8; resto: 3–4 dígitos de área.
  if (d.startsWith("11") && d.length >= 10) {
    return { area_code: "11", number: d.slice(2) };
  }
  if (d.length >= 10) {
    return { area_code: d.slice(0, 3), number: d.slice(3) };
  }
  if (d.length >= 8) {
    return { area_code: d.slice(0, 2), number: d.slice(2) };
  }
  return { area_code: d.slice(0, 2) || "11", number: d.slice(2) || d };
}

function addressFromFields(
  fields: Record<string, string>,
  prefix: "" | "fact_",
): MpAddress | null {
  const calle = (fields[`${prefix}calle`] || "").trim();
  const numero = (fields[`${prefix}numero`] || "").trim();
  const localidad = (fields[`${prefix}localidad`] || "").trim();
  const provincia = (fields[`${prefix}provincia`] || "").trim();
  if (!calle || !numero || !localidad || !provincia) return null;
  return {
    street_name: calle,
    street_number: numero,
    floor: (fields[`${prefix}piso`] || "").trim() || null,
    apartment: (fields[`${prefix}departamento`] || "").trim() || null,
    zip_code: (fields[`${prefix}codigo_postal`] || "").trim() || null,
    city: localidad,
    federal_unit: provincia,
    neighborhood: (fields[`${prefix}barrio`] || "").trim() || null,
  };
}

/** Extrae direcciones del form de checkout para enriquecer VentaPendiente / MP. */
export function addressesFromCheckoutFields(fields: Record<string, string>): {
  address_billing: MpAddress | null;
  address_shipping: MpAddress | null;
} {
  const tipo = (fields.tipo_entrega || "").trim();
  const misma = fields.misma_direccion_facturacion === "1";
  const shipping = tipo === "envio" ? addressFromFields(fields, "") : null;
  const billing =
    misma && shipping
      ? shipping
      : addressFromFields(fields, "fact_") ?? shipping;
  return { address_billing: billing, address_shipping: shipping };
}

function mpReceiverAddress(addr: MpAddress) {
  return {
    zip_code: addr.zip_code || undefined,
    street_name: addr.street_name,
    street_number: addr.street_number,
    floor: addr.floor || undefined,
    apartment: addr.apartment || undefined,
    city_name: addr.city,
    state_name: addr.federal_unit,
  };
}

function authenticationType(checkoutMode: string | null | undefined): string {
  const m = (checkoutMode || "").toLowerCase();
  if (m === "google") return "Gmail";
  if (m === "invitado") return "Guest";
  return "Native web";
}

/** Payer de Preference (Checkout Pro / Wallet). */
export function buildPreferencePayer(src: MpPayerSource) {
  const identification = mpIdentification(
    src.tipo_documento,
    src.numero_documento,
  );
  const phone = mpPhone(src.telefono);
  const addr = src.address_billing || src.address_shipping;
  return {
    name: src.nombre,
    surname: src.apellido,
    email: src.mail,
    ...(phone ? { phone } : {}),
    ...(identification ? { identification } : {}),
    ...(addr
      ? {
          address: {
            zip_code: addr.zip_code || undefined,
            street_name: addr.street_name,
            street_number: addr.street_number,
          },
        }
      : {}),
  };
}

/** Shipments de Preference. */
export function buildPreferenceShipments(src: MpPayerSource) {
  const addr = src.address_shipping;
  if (!addr || src.tipo_entrega !== "envio") return undefined;
  return {
    receiver_address: {
      zip_code: addr.zip_code || undefined,
      street_name: addr.street_name,
      street_number: addr.street_number,
      floor: addr.floor || undefined,
      apartment: addr.apartment || undefined,
      city_name: addr.city,
      state_name: addr.federal_unit,
      country_name: "Argentina",
    },
  };
}

/** Items de Preference / additional_info. */
export function buildMpItems(src: MpPayerSource) {
  const items = src.itemsCobro.map((item) => ({
    id: String(item.id_producto),
    title: item.titulo.slice(0, 256),
    description: item.titulo.slice(0, 256),
    quantity: item.cantidad,
    unit_price: item.unit_price,
    category_id: "others",
  }));
  if (src.costo_envio > 0) {
    items.push({
      id: "shipping",
      title: "Costo de envío",
      description: "Envío a domicilio",
      quantity: 1,
      unit_price: src.costo_envio,
      category_id: "others",
    });
  }
  return items;
}

/** Payer top-level de POST /v1/payments. */
export function buildPaymentPayer(
  src: MpPayerSource,
  brickPayer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  },
) {
  const fromBrick =
    brickPayer?.identification?.type && brickPayer.identification.number
      ? {
          type: brickPayer.identification.type,
          number: digitsOnly(brickPayer.identification.number),
        }
      : undefined;
  const identification =
    fromBrick?.number
      ? fromBrick
      : mpIdentification(src.tipo_documento, src.numero_documento);

  return {
    email: brickPayer?.email || src.mail,
    first_name: src.nombre,
    last_name: src.apellido,
    ...(identification ? { identification } : {}),
  };
}

/** additional_info de POST /v1/payments. */
export function buildPaymentAdditionalInfo(
  src: MpPayerSource,
  ipAddress?: string | null,
) {
  const phone = mpPhone(src.telefono);
  const addr = src.address_billing || src.address_shipping;
  return {
    ...(ipAddress ? { ip_address: ipAddress } : {}),
    items: src.itemsCobro.map((item) => ({
      id: String(item.id_producto),
      title: item.titulo.slice(0, 256),
      description: item.titulo.slice(0, 256),
      quantity: item.cantidad,
      unit_price: item.unit_price,
      category_id: "others",
    })),
    payer: {
      first_name: src.nombre,
      last_name: src.apellido,
      ...(phone
        ? { phone: { area_code: phone.area_code, number: phone.number } }
        : {}),
      ...(addr
        ? {
            address: {
              zip_code: addr.zip_code || undefined,
              street_name: addr.street_name,
              street_number: addr.street_number,
              neighborhood: addr.neighborhood || undefined,
              city: addr.city,
              federal_unit: addr.federal_unit,
            },
          }
        : {}),
      authentication_type: authenticationType(src.checkout_mode),
    },
    ...(src.address_shipping && src.tipo_entrega === "envio"
      ? {
          shipments: {
            receiver_address: mpReceiverAddress(src.address_shipping),
            pick_up_on_seller: false,
          },
        }
      : src.tipo_entrega === "retiro"
        ? { shipments: { pick_up_on_seller: true } }
        : {}),
  };
}

/** IP del cliente desde headers de NextRequest. */
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || null;
}

export function toMpPayerSource(
  venta: MpPayerSource & { id_venta?: number },
): MpPayerSource {
  return {
    nombre: venta.nombre,
    apellido: venta.apellido,
    mail: venta.mail,
    telefono: venta.telefono,
    tipo_documento: venta.tipo_documento,
    numero_documento: venta.numero_documento,
    checkout_mode: venta.checkout_mode,
    tipo_entrega: venta.tipo_entrega,
    address_billing: venta.address_billing,
    address_shipping: venta.address_shipping,
    itemsCobro: venta.itemsCobro,
    costo_envio: venta.costo_envio,
  };
}
