import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Parsea DD/M/YYYY o D/M/YYYY → Date UTC. */
function d(s: string): Date {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

const rows: { impuesto: string; desde: string; hasta: string | null; orden: number }[] = [
  {
    impuesto: "Exentos de Retenciones y Percepciones de IVA",
    desde: "01/04/2026",
    hasta: "31/5/2026",
    orden: 1,
  },
  {
    impuesto: "No Retención y No Percepción Ganancias",
    desde: "01/04/2026",
    hasta: "31/03/2027",
    orden: 2,
  },
  {
    impuesto: "Certificado de NO Retención de Catamarca",
    desde: "01/08/2025",
    hasta: "31/07/2026",
    orden: 3,
  },
  {
    impuesto: "Certificado de NO Percepción de Catamarca",
    desde: "01/08/2025",
    hasta: "31/07/2026",
    orden: 4,
  },
  {
    impuesto: "Exclusión de Retenciones y Percepciones Tucumán",
    desde: "01/07/2026",
    hasta: "31/12/2026",
    orden: 5,
  },
  {
    impuesto: "Exclusión de Recaudación Bancaria Tucumán",
    desde: "01/04/2026",
    hasta: "30/09/2026",
    orden: 6,
  },
  {
    impuesto: "Exclusión de IB de Retención y Percepción de Corrientes",
    desde: "21/8/2025",
    hasta: "22/08/2026",
    orden: 7,
  },
  {
    // En el sitio original figura 02/01/0206; se corrige a 2026
    impuesto: "Certificado de NO Retención y Percepción de Tierra del Fuego",
    desde: "02/01/2026",
    hasta: "01/04/2026",
    orden: 8,
  },
  {
    impuesto: "Exclusión de Recaudacion Bancaria Misiones",
    desde: "01/02/2023",
    hasta: null,
    orden: 9,
  },
  {
    impuesto: "Exclusión automática de no retención y percepción IIBB Neuquen",
    desde: "26/07/2023",
    hasta: null,
    orden: 10,
  },
  {
    impuesto: "Exclusión del Régimen de percepción en Aduana en IIBB de Tucuman",
    desde: "13/06/2024",
    hasta: null,
    orden: 11,
  },
  {
    impuesto: "No retención IB Sirpei",
    desde: "03/07/2025",
    hasta: "02/01/2026",
    orden: 12,
  },
  {
    impuesto: "Certificado de NO Retención y Percepción de Santiago del Estero",
    desde: "04/03/2026",
    hasta: "01/06/2026",
    orden: 13,
  },
  {
    impuesto: "Exclusión de IB de Retención y Percepción de San Luis",
    desde: "6/11/2025",
    hasta: "30/9/2026",
    orden: 14,
  },
  {
    impuesto: "Certificado de NO Retención y Percepción de IIBB San Juan",
    desde: "18/12/2025",
    hasta: "18/4/2026",
    orden: 15,
  },
  {
    impuesto: "Certificado de NO Retención/Percepción de Santiago del Estero",
    desde: "27/05/2026",
    hasta: "25/08/2026",
    orden: 16,
  },
];

async function main() {
  const count = await prisma.exclusion_fiscal.count();
  if (count > 0) {
    console.log(`Ya hay ${count} exclusiones; no se re-seedan.`);
    return;
  }
  for (const r of rows) {
    await prisma.exclusion_fiscal.create({
      data: {
        impuesto: r.impuesto,
        vigencia_desde: d(r.desde),
        vigencia_hasta: r.hasta ? d(r.hasta) : null,
        orden: r.orden,
        activo: true,
      },
    });
  }
  console.log(`Seed OK: ${rows.length} exclusiones`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
