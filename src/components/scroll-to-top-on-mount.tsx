"use client";

import { useEffect } from "react";

/**
 * Al entrar a un producto (o cambiar de variante) a veces el navegador
 * conserva el scroll de la página anterior — el header queda sticky en top:0
 * y tapa el título, que parece "cortado". Fuerza volver arriba apenas monta,
 * sin depender de que el scroll restoration del navegador/Next lo haga bien.
 */
export function ScrollToTopOnMount({ watch }: { watch: string }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  return null;
}
