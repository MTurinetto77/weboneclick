import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin "standalone": Hostinger Node Apps usa `next start -p $PORT`.
  experimental: {
    serverActions: {
      // PDFs fiscales (p. ej. legajos) suelen superar el default de 1 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
