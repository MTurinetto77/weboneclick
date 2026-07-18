import https from "https";
import http from "http";
import fs from "fs";
import path from "path";

function get(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function main() {
  const assets: [string, string][] = [
    ["public/oneclick/pages/manda-cv.webp", "https://www.oneclickstore.com/wp-content/smush-webp/2025/07/mandacv_img.png.webp"],
    ["public/oneclick/pages/empresas.jpg", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/empresas-01-768x768.jpg.webp"],
    ["public/oneclick/pages/invoice.jpg", "https://www.oneclickstore.com/wp-content/uploads/2025/07/new-invoice.jpg"],
    ["public/oneclick/pages/visa.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/visa-03-150x60.jpg.webp"],
    ["public/oneclick/pages/mastercard.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/mastercard-03-150x60.jpg.webp"],
    ["public/oneclick/pages/mercadopago.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/mp-logo-150x39.png.webp"],
    ["public/oneclick/pages/download-pdf.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/07/download_pdf.png.webp"],
    ["public/oneclick/tiendas/palermo.jpeg", "https://www.oneclickstore.com/wp-content/uploads/2025/08/tienda-apple-oneclick-palermo-soho.jpeg"],
    ["public/oneclick/tiendas/el-solar.jpg", "https://www.oneclickstore.com/wp-content/uploads/2025/08/tienda-apple-oneclick-el-solar-shopping-scaled.jpg"],
    ["public/oneclick/tiendas/rosario-centro.jpeg", "https://www.oneclickstore.com/wp-content/uploads/2025/08/tienda-apple-oneclick-rosario-centro.jpeg"],
    ["public/oneclick/tiendas/alto-rosario.jpeg", "https://www.oneclickstore.com/wp-content/uploads/2025/08/tienda-apple-oneclick-alto-rosario-shopping.jpeg"],
    ["public/oneclick/tiendas/cordoba.jpeg", "https://www.oneclickstore.com/wp-content/uploads/2025/08/tienda-apple-oneclick-cordoba-shopping.jpeg"],
    ["public/oneclick/tiendas/dot.jpeg", "https://www.oneclickstore.com/wp-content/uploads/2025/08/tienda-apple-oneclick-dotbaires.jpeg"],
  ];

  for (const [dest, url] of assets) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      const buf = await get(url);
      fs.writeFileSync(dest, buf);
      console.log("ok", dest, buf.length);
    } catch (e) {
      console.log("fail", dest, (e as Error).message);
    }
  }
}

main();
