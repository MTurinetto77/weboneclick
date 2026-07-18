/**
 * Inspección rápida de modelos Odoo relevantes para el sync.
 * Uso: npx tsx scripts/inspect-odoo.ts
 */
import "dotenv/config";
import { executeKw, searchCount, searchRead } from "../src/lib/odoo";

async function main() {
  const models = [
    { model: "product.category", domain: [] as unknown[] },
    { model: "stock.warehouse", domain: [] as unknown[] },
    { model: "product.brand", domain: [] as unknown[] },
    { model: "product.tag", domain: [] as unknown[] },
    {
      model: "product.product",
      domain: [["x_studio_publicado_web", "=", true]] as unknown[],
    },
  ];

  for (const m of models) {
    const count = await searchCount(m.model, m.domain);
    console.log(`${m.model}: ${count}`);
  }

  const sample = await searchRead(
    "product.product",
    [["x_studio_publicado_web", "=", true]],
    [
      "id",
      "display_name",
      "default_code",
      "list_price",
      "categ_id",
      "product_brand_id",
      "product_tag_ids",
      "x_studio_publicado_web",
    ],
    { limit: 3 }
  );
  console.log("\nSample products:");
  console.log(JSON.stringify(sample, null, 2));

  try {
    const fields = await executeKw<Record<string, { string: string; type: string }>>(
      "product.product",
      "fields_get",
      [],
      { attributes: ["string", "type"] }
    );
    const interesting = Object.entries(fields)
      .filter(
        ([k, v]) =>
          /brand|tag|publicado|image|categ|price|web/i.test(k) ||
          /brand|tag|publicado|web/i.test(v.string)
      )
      .map(([k, v]) => `${k} [${v.type}] ${v.string}`);
    console.log("\nRelevant fields:");
    interesting.forEach((l) => console.log(" ", l));
  } catch (e) {
    console.warn("fields_get failed", e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
