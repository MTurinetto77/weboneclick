/**
 * Verifica alineación de brutos al redondeo Odoo (caso OCWN-42).
 * Uso: npx tsx scripts/test-odoo-amount.ts
 */
import {
  alignGrossesToOdooTotal,
  predictOdooAmountTotal,
  round2,
} from "../src/lib/odoo-amount";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function almost(a: number, b: number) {
  return Math.abs(round2(a) - round2(b)) < 0.001;
}

// OCWN-42: cable 13999 + envío 18516.84 @ 21%
const items = [
  {
    id_producto: 714,
    titulo: "Cable PureGear 1.2 m USB-A a USB-C - Negro",
    cantidad: 1,
    unit_price: 13999,
    rate: 0.21,
  },
];
const costoComercial = 18516.84;

const predicted = predictOdooAmountTotal([
  { grossUnit: 13999, qty: 1, rate: 0.21 },
  { grossUnit: costoComercial, qty: 1, rate: 0.21 },
]);
assert(almost(predicted, 32515.83), `predicted=${predicted}, expected 32515.83`);

const aligned = alignGrossesToOdooTotal({
  items,
  costo_envio: costoComercial,
});
assert(
  almost(aligned.total, 32515.83),
  `aligned.total=${aligned.total}, expected 32515.83`,
);
assert(
  almost(aligned.costo_envio, 18516.83),
  `aligned.costo_envio=${aligned.costo_envio}, expected 18516.83`,
);
assert(
  almost(aligned.items[0]!.unit_price, 13999),
  `product unit should stay 13999, got ${aligned.items[0]!.unit_price}`,
);

// Re-predicción estable tras alinear
const predictedAfter = predictOdooAmountTotal([
  { grossUnit: aligned.items[0]!.unit_price, qty: 1, rate: 0.21 },
  { grossUnit: aligned.costo_envio, qty: 1, rate: 0.21 },
]);
assert(
  almost(predictedAfter, aligned.total),
  `predictedAfter=${predictedAfter} != aligned.total=${aligned.total}`,
);

// Sin envío: si ya cuadra, no-op
const soloProducto = alignGrossesToOdooTotal({
  items: [
    {
      id_producto: 1,
      titulo: "X",
      cantidad: 1,
      unit_price: 1210,
      rate: 0.21,
    },
  ],
  costo_envio: 0,
});
assert(almost(soloProducto.total, 1210), `soloProducto.total=${soloProducto.total}`);

console.log("ok: odoo-amount OCWN-42 + casos básicos");
