"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductGallery } from "@/components/product-gallery";
import {
  findIphone17Variant,
  getIphone17ColorLabel,
  IPHONE_17_CAPACITIES,
  IPHONE_17_COLORS,
  IPHONE_17_CUOTA_OPTIONS,
  type Iphone17Capacity,
  type Iphone17ColorId,
  type Iphone17CuotaId,
} from "@/lib/demo/iphone-17-data";
import { formatPriceArs, precioContado, precioSinImpuestos } from "@/lib/pricing";

function DeliveryBlock() {
  return (
    <div className="oc-pdp-delivery">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="oc-pdp-delivery-icon"
        src="/delivery-24hs.svg"
        alt=""
        width={40}
        height={40}
        aria-hidden
      />
      <div className="oc-pdp-delivery-text">
        <strong>Entrega dentro de las 24hs en AMBA</strong>
        <p>Recibilo en 24hs comprando antes de las 12hs</p>
      </div>
    </div>
  );
}

function BankPromoBlock({
  cuotas,
  cuotaMonto,
}: {
  cuotas: number;
  cuotaMonto: number | null;
}) {
  return (
    <div className="oc-pdp-bank">
      <h4>Promociones Bancarias</h4>
      <div className="oc-pdp-bank-row">
        <div className="oc-pdp-bank-info">
          <p className="oc-pdp-bank-title">{cuotas} cuotas sin interés</p>
          <p className="oc-pdp-bank-sub">
            Con todas las tarjetas y bancos
            {cuotaMonto != null ? ` - Cuotas de ${formatPriceArs(cuotaMonto)}` : null}
          </p>
        </div>
        <div className="oc-pdp-bank-pay">
          <ul className="oc-pdp-bank-cards" aria-label="Tarjetas">
            <li>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payment/mastercard.jpg" alt="Mastercard" width={56} height={36} />
            </li>
            <li>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payment/visa.jpg" alt="VISA" width={56} height={36} />
            </li>
          </ul>
          <div className="oc-pdp-bank-mp">
            <span>Pagando con:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/payment/mercadopago.png" alt="Mercado Pago" width={72} height={19} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Iphone17VariantPdp() {
  const [capacity, setCapacity] = useState<Iphone17Capacity>("256 GB");
  const [colorId, setColorId] = useState<Iphone17ColorId>("negro");
  const [cuotaId, setCuotaId] = useState<Iphone17CuotaId>("12");

  const variant = findIphone17Variant(capacity, colorId);
  const colorLabel = getIphone17ColorLabel(colorId);
  const cuotaOpt = IPHONE_17_CUOTA_OPTIONS.find((o) => o.id === cuotaId)!;
  const isContado = cuotaOpt.installments === 0;

  const lista = variant.price;
  const contado = precioContado(lista)!;
  const displayPrice = isContado ? contado : lista;
  const sinImp = precioSinImpuestos(displayPrice);
  const installments = isContado ? 12 : cuotaOpt.installments;
  const cuotaMonto = lista / (isContado ? 12 : cuotaOpt.installments);

  const title = `iPhone 17 ${capacity} - ${colorLabel}`;

  return (
    <div className="oc-product-detail oc-demo-pdp">
      <ProductGallery
        key={`${capacity}-${colorId}`}
        images={variant.images}
        alt={title}
        outOfStock={!variant.inStock}
      />

      <div className="oc-pdp-buybox">
        <p className="oc-demo-pdp-badge">Demo · variantes</p>
        <p className="oc-pdp-brand">
          <Link href="/marca/apple">Apple</Link>
        </p>
        <h1>iPhone 17</h1>
        <p className="oc-demo-pdp-variant-name">{title}</p>

        <div className="oc-demo-pdp-price-block">
          {isContado ? (
            <>
              <p className="oc-price-old">{formatPriceArs(lista)}</p>
              <p className="oc-price-row">
                <span className="oc-price-pct">−10%</span>
                <span className="oc-price oc-price-sale">{formatPriceArs(contado)}</span>
              </p>
              <p className="oc-contado">Precio contado con 10% de descuento</p>
            </>
          ) : (
            <>
              <p className="oc-price">{formatPriceArs(lista)}</p>
              <p className="oc-cuotas">
                {cuotaOpt.installments} cuotas sin interés de{" "}
                {formatPriceArs(cuotaMonto)}
              </p>
              <p className="oc-contado">Pagando contado 10% de descuento</p>
            </>
          )}
          {sinImp != null && (
            <p className="oc-sin-imp">Sin imp nacionales: {formatPriceArs(sinImp)}</p>
          )}
        </div>

        <fieldset className="oc-demo-pdp-attr">
          <legend>Capacidad</legend>
          <div className="oc-demo-pdp-pills" role="listbox" aria-label="Capacidad">
            {IPHONE_17_CAPACITIES.map((cap) => (
              <button
                key={cap}
                type="button"
                role="option"
                aria-selected={capacity === cap}
                className={`oc-demo-pdp-pill${capacity === cap ? " is-active" : ""}`}
                onClick={() => setCapacity(cap)}
              >
                {cap}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="oc-demo-pdp-attr">
          <legend>
            Color <span className="oc-demo-pdp-attr-value">{colorLabel}</span>
          </legend>
          <div className="oc-demo-pdp-swatches" role="listbox" aria-label="Color">
            {IPHONE_17_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                role="option"
                aria-selected={colorId === color.id}
                aria-label={color.label}
                title={color.label}
                className={`oc-demo-pdp-swatch${colorId === color.id ? " is-active" : ""}${
                  color.id === "blanco" ? " is-light" : ""
                }`}
                style={{ backgroundColor: color.hex }}
                onClick={() => setColorId(color.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="oc-demo-pdp-attr">
          <legend>Cuotas</legend>
          <div className="oc-demo-pdp-pills" role="listbox" aria-label="Cuotas">
            {IPHONE_17_CUOTA_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={cuotaId === opt.id}
                className={`oc-demo-pdp-pill${cuotaId === opt.id ? " is-active" : ""}`}
                onClick={() => setCuotaId(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {variant.inStock ? (
          <>
            <p className="oc-pdp-in-stock">Hay existencias</p>
            <button type="button" className="oc-btn oc-btn-dark oc-pdp-add-btn" disabled>
              Agregar al carrito (demo)
            </button>
            <DeliveryBlock />
            <BankPromoBlock cuotas={installments} cuotaMonto={cuotaMonto} />
          </>
        ) : (
          <>
            <p className="oc-pdp-oos-label">Sin existencias</p>
            <button type="button" className="oc-btn oc-btn-dark oc-pdp-add-btn" disabled>
              Sin stock
            </button>
            <DeliveryBlock />
            <BankPromoBlock cuotas={installments} cuotaMonto={cuotaMonto} />
          </>
        )}
      </div>
    </div>
  );
}
