"use client";

import { useEffect, useRef, useState } from "react";
import { useAddToCart } from "@/components/add-to-cart";
import { uploadPublicUrl } from "@/lib/utils";

type Props = {
  idProducto: number;
  titulo: string;
  configuracion: string;
  precio: string;
  cuotas: string | null;
  imagen: string | null;
  disponible: boolean;
};

/**
 * Barra de compra que aparece cuando el buybox del hero ya salió de pantalla,
 * para no perder el precio ni el botón durante todo el recorrido de la página.
 */
export function BuyBar({
  idProducto,
  titulo,
  configuracion,
  precio,
  cuotas,
  imagen,
  disponible,
}: Props) {
  const [visible, setVisible] = useState(false);
  const centinela = useRef<HTMLDivElement>(null);
  const { add, pending, modal } = useAddToCart();

  useEffect(() => {
    const el = centinela.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entrada]) => setVisible(!entrada.isIntersecting && entrada.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={centinela} className="ocx-buybar-anchor" aria-hidden />
      <div className={`ocx-buybar${visible ? " is-visible" : ""}`}>
        <div className="ocx-buybar-inner">
          {imagen && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="ocx-buybar-thumb" src={uploadPublicUrl(imagen)} alt="" aria-hidden />
          )}
          <div className="ocx-buybar-text">
            <p className="ocx-buybar-title">{titulo}</p>
            <p className="ocx-buybar-config">{configuracion}</p>
          </div>
          <div className="ocx-buybar-price">
            <p className="ocx-buybar-amount">{precio}</p>
            {cuotas && <p className="ocx-buybar-cuotas">{cuotas}</p>}
          </div>
          {disponible ? (
            <button
              type="button"
              className="ocx-btn ocx-btn-primary ocx-buybar-cta"
              disabled={pending}
              onClick={() => add(idProducto, 1)}
            >
              Comprar
            </button>
          ) : (
            <span className="ocx-buybar-oos">Sin stock</span>
          )}
        </div>
      </div>
      {modal}
    </>
  );
}
