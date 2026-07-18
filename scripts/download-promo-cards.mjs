import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT = path.join(process.cwd(), "public", "oneclick", "promos");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  await page.goto("https://www.oneclickstore.com/", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(4500);

  // Scroll to load lazy images
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
    }
  });
  await page.waitForTimeout(2000);

  const found = await page.evaluate(() => {
    const keywords = [
      "regalo",
      "mophie",
      "experiencia",
      "asesores",
      "problema",
      "servicio técnico",
      "iphone 17",
    ];
    const imgs = [...document.querySelectorAll("img")].map((img) => ({
      src: img.currentSrc || img.src,
      alt: (img.alt || "").toLowerCase(),
      nearby: (img.closest("section,div,article")?.innerText || "").slice(0, 200).toLowerCase(),
      w: img.naturalWidth,
      h: img.naturalHeight,
    }));

    const hits = imgs.filter(
      (i) =>
        i.w > 80 &&
        keywords.some((k) => i.alt.includes(k) || i.nearby.includes(k) || i.src.toLowerCase().includes(k))
    );
    return { hits: hits.slice(0, 30), allLarge: imgs.filter((i) => i.w > 200).slice(0, 40) };
  });

  console.log(JSON.stringify(found, null, 2));

  // Also screenshot the three promo cards region by finding text
  const boxes = await page.evaluate(() => {
    const texts = [
      "Tu nuevo iPhone viene con regalo",
      "Buscás experiencia personalizada",
      "problema con tu iPhone",
    ];
    return texts.map((t) => {
      const el = [...document.querySelectorAll("h2,h3,h4,p,div")].find((n) =>
        (n.textContent || "").includes(t)
      );
      if (!el) return null;
      const card = el.closest("div,section,article") || el;
      // climb to a reasonably sized card
      let node = card;
      for (let i = 0; i < 6; i++) {
        const r = node.getBoundingClientRect();
        if (r.width > 280 && r.height > 180) break;
        if (!node.parentElement) break;
        node = node.parentElement;
      }
      const r = node.getBoundingClientRect();
      return { t, x: r.x, y: r.y + window.scrollY, w: r.width, h: r.height };
    });
  });

  console.log("boxes", boxes);

  let i = 0;
  for (const b of boxes) {
    if (!b || b.w < 100) continue;
    i += 1;
    await page.screenshot({
      path: path.join(OUT, `card-${i}.jpg`),
      clip: {
        x: Math.max(0, b.x),
        y: Math.max(0, b.y),
        width: Math.min(b.w, 1440 - b.x),
        height: Math.min(b.h, 900),
      },
      type: "jpeg",
      quality: 88,
    });
    console.log("shot card", i, b);
  }

  // Download promising image URLs
  let n = 0;
  for (const img of [...found.hits, ...found.allLarge]) {
    if (!img.src || img.src.startsWith("data:")) continue;
    if (/lazy\.svg|placeholder/i.test(img.src)) continue;
    n += 1;
    if (n > 20) break;
    try {
      const res = await page.request.get(img.src);
      if (!res.ok()) continue;
      const buf = await res.body();
      if (buf.length < 5000) continue;
      const ext = img.src.includes(".webp")
        ? ".webp"
        : img.src.includes(".png")
          ? ".png"
          : ".jpg";
      await writeFile(path.join(OUT, `img-${n}${ext}`), buf);
      console.log("dl", n, buf.length, img.src.slice(0, 100));
    } catch {}
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
