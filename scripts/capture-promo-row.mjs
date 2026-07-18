import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/oneclick/promos");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

await page.goto("https://www.oneclickstore.com/", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await page.waitForTimeout(6000);

// Scroll whole page to trigger lazy load
for (let y = 0; y < 4500; y += 500) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(300);
}

const probe = await page.evaluate(() => {
  const body = document.body.innerText;
  return {
    has1: body.includes("viene con regalo"),
    has2: body.includes("experiencia personalizada"),
    has3: body.includes("problema con tu iPhone"),
    hasFiesta: body.includes("Llevá la fiesta"),
  };
});
console.log("probe", probe);

await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) =>
    (e.textContent || "").includes("viene con regalo"),
  );
  el?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(1000);

// Find parent row containing all 3
const row = await page.evaluate(() => {
  const h = [...document.querySelectorAll("*")].find((e) => {
    const t = (e.textContent || "").trim();
    return t.includes("viene con regalo") && t.length < 250;
  });
  if (!h) return null;
  let el = h;
  for (let i = 0; i < 25; i++) {
    el = el.parentElement;
    if (!el) break;
    const t = el.innerText || "";
    const r = el.getBoundingClientRect();
    if (
      t.includes("experiencia personalizada") &&
      t.includes("problema con tu iPhone") &&
      r.width > 900 &&
      r.height > 150 &&
      r.height < 450
    ) {
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }
  }
  return null;
});
console.log("row", row);

if (row) {
  await page.screenshot({
    path: path.join(outDir, "live-promo-row.png"),
    clip: {
      x: Math.max(0, row.x),
      y: Math.max(0, row.y),
      width: Math.min(row.width, 1600 - Math.max(0, row.x)),
      height: Math.min(row.height, 1000 - Math.max(0, row.y)),
    },
  });
  console.log("saved live-promo-row.png");

  // split into 3 equal cards
  const sharp = (await import("sharp")).default;
  const imgPath = path.join(outDir, "live-promo-row.png");
  const meta = await sharp(imgPath).metadata();
  const gap = Math.round(meta.width * 0.01);
  const cardW = Math.floor((meta.width - gap * 2) / 3);
  const names = ["iphone-regalo", "experiencia", "servicio"];
  for (let i = 0; i < 3; i++) {
    const left = i * (cardW + gap);
    await sharp(imgPath)
      .extract({ left, top: 0, width: cardW, height: meta.height })
      .png()
      .toFile(path.join(outDir, `hi-${names[i]}.png`));
    // media only right 45%
    const mLeft = Math.round(cardW * 0.5);
    await sharp(imgPath)
      .extract({
        left: left + mLeft,
        top: 0,
        width: cardW - mLeft,
        height: meta.height,
      })
      .webp({ quality: 92 })
      .toFile(path.join(outDir, `media-${names[i]}.webp`));
    console.log("wrote hi+", names[i]);
  }
}

await browser.close();
