/**
 * Prueba de envío del mail de confirmación de pedido.
 * NO crea venta, NO llama Mercado Pago, NO sincroniza Odoo.
 *
 * Uso:
 *   npm run test:order-mail
 *   npm run test:order-mail -- --venta-id 123
 */
import "dotenv/config";
import {
  buildOrderMailPayloadFromVenta,
  sendOrderConfirmationPayload,
  type OrderMailPayload,
} from "../src/lib/order-mail";
import { isMailConfigured } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";

const TEST_TO = "ing.lmarchi@gmail.com";

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function samplePayload(): OrderMailPayload {
  return {
    idVenta: 999001,
    clienteNombre: "Luis",
    to: TEST_TO,
    detalles: [
      { nombre: "iPhone 15 128GB", cantidad: 1, subtotal: 1_299_999 },
      { nombre: "Funda MagSafe", cantidad: 2, subtotal: 39_998 },
    ],
    subtotal: 1_339_997,
    descuento: 20_000,
    costoEnvio: 5_500,
    total: 1_325_497,
    tipoEntrega: "envio",
    entregaResumen: "Av. Corrientes 1234, piso 5 B\nCABA, Buenos Aires",
    pagos: [
      {
        tipo_pago: "mercado_pago",
        estado: "aprobado",
        monto: 1_325_497,
      },
    ],
  };
}

async function main() {
  if (!isMailConfigured()) {
    console.error("[order-mail] SMTP no configurado en .env (SMTP_HOST/USER/PASS)");
    process.exit(1);
  }

  const ventaIdRaw = argValue("--venta-id");
  let payload: OrderMailPayload;

  if (ventaIdRaw) {
    const idVenta = Number(ventaIdRaw);
    if (!Number.isInteger(idVenta) || idVenta <= 0) {
      console.error("[order-mail] --venta-id inválido:", ventaIdRaw);
      process.exit(1);
    }
    const fromDb = await buildOrderMailPayloadFromVenta(idVenta, {
      to: TEST_TO,
    });
    if (!fromDb) {
      console.error("[order-mail] venta no encontrada:", idVenta);
      process.exit(1);
    }
    payload = fromDb;
    console.log("[order-mail] usando venta existente (solo lectura)", {
      idVenta,
      to: TEST_TO,
    });
  } else {
    payload = samplePayload();
    console.log("[order-mail] usando payload de ejemplo (sin DB/Odoo)", {
      idVenta: payload.idVenta,
      to: TEST_TO,
    });
  }

  await sendOrderConfirmationPayload(payload);
  console.log("[order-mail] prueba OK →", TEST_TO);
}

main()
  .catch((err) => {
    console.error("[order-mail] prueba falló", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
