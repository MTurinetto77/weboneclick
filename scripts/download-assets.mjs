/**
 * Descarga assets públicos de oneclickstore.com a public/oneclick/
 * Uso: node scripts/download-assets.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "oneclick");

const ASSETS = [
  {
    name: "logo.png",
    url: "https://www.oneclickstore.com/wp-content/uploads/2022/03/logo-oneclick.png",
  },
  {
    name: "logo-apple-premium.png",
    url: "https://www.oneclickstore.com/wp-content/uploads/2022/03/oneclick-apple-premium-reseller-01.png",
  },
  {
    name: "placeholder-hero.jpg",
    url: "https://www.oneclickstore.com/wp-content/uploads/2025/12/banner-home-desktop.webp",
  },
];

async function download(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": "OneClickCloneAssetBot/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log("OK", path.basename(dest), buf.length, "bytes");
}

async function scrapeHomeImages() {
  const res = await fetch("https://www.oneclickstore.com/", {
    headers: { "User-Agent": "OneClickCloneAssetBot/1.0" },
  });
  if (!res.ok) throw new Error(`Home fetch ${res.status}`);
  const html = await res.text();
  const urls = new Set();
  const re = /https?:\/\/[^"'\s>]+\.(?:png|jpe?g|webp|svg)/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = m[0].replace(/&amp;/g, "&");
    if (u.includes("oneclickstore.com") || u.includes("wp-content")) urls.add(u);
  }
  return [...urls].slice(0, 40);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(path.join(OUT, "scraped"), { recursive: true });

  for (const a of ASSETS) {
    try {
      await download(a.url, path.join(OUT, a.name));
    } catch (e) {
      console.warn("SKIP", a.name, e.message);
    }
  }

  try {
    const scraped = await scrapeHomeImages();
    console.log(`Found ${scraped.length} image URLs on home`);
    let i = 0;
    for (const url of scraped) {
      i += 1;
      const ext = path.extname(new URL(url).pathname) || ".jpg";
      const name = `home-${String(i).padStart(2, "0")}${ext.split("?")[0]}`;
      try {
        await download(url, path.join(OUT, "scraped", name));
      } catch (e) {
        console.warn("SKIP scraped", name, e.message);
      }
    }
  } catch (e) {
    console.warn("Home scrape failed:", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
