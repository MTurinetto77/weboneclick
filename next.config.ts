import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin "standalone": Hostinger Node Apps usa `next start -p $PORT`.
  // Oculta el indicador de ruta (ícono Next.js) que se ve en la esquina
  // inferior izquierda durante desarrollo. No afecta producción (ya no se
  // renderiza ahí) ni el reporte de errores de compilación/runtime.
  devIndicators: false,
};

export default nextConfig;
