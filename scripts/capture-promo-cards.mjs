import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/oneclick/promos");
fs.mkdirSync(outDir, { recursive: true });

const titles = [
  { key: "iphone-regalo", match: "Tu nuevo iPhone viene con regalo" },
  { key: "experiencia", match: "experiencia personalizada" },
  { key: "servicio", match: "problema con tu iPhone" },
];

function extractBgUrls(bg) {
  if (!bg || bg === "none") return [];
  const urls = [];
  const re = /url\((['"]?)(.*?)\1\)/g;
  let m;
  while ((m = re.exec(bg))) urls.push(m[2]);
  return urls;
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

await page.goto("https://www.oneclickstore.com/", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await page.waitForTimeout(5000);

await page.evaluate(() => {
  const el = [...document.querySelectorAll("h2,h3,h4,div,span")].find((e) =>
    (e.innerText || "").includes("Tu nuevo iPhone viene con regalo"),
  );
  el?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(1500);

const assets = [];

for (const t of titles) {
  const box = await page.evaluate((match) => {
    const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5,p,div,span")].find(
      (el) => {
        const tx = (el.innerText || "").trim();
        return tx.includes(match) && tx.length < 180;
      },
    );
    if (!heading) return null;
    let el = heading;
    for (let d = 0; d < 20; d++) {
      el = el.parentElement;
      if (!el) break;
      const r = el.getBoundingClientRect();
      if (r.width >= 300 && r.width <= 560 && r.height >= 180 && r.height <= 340) {
        const imgs = [...el.querySelectorAll("img")].map((im) => ({
          src: im.currentSrc || im.src,
          alt: im.alt,
          nw: im.naturalWidth,
          nh: im.naturalHeight,
        }));
        const bgs = [];
        el.querySelectorAll("*").forEach((n) => {
          const bg = getComputedStyle(n).backgroundImage;
          if (bg && bg !== "none") {
            bgs.push({
              bg,
              w: Math.round(n.getBoundingClientRect().width),
              h: Math.round(n.getBoundingClientRect().height),
            });
          }
        });
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          imgs,
          bgs,
        };
      }
    }
    return null;
  }, t.match);

  console.log(t.key, box ? { w: box.width, h: box.height, imgs: box.imgs, bgs: box.bgs } : null);

  if (box) {
    await page.screenshot({
      path: path.join(outDir, `live-${t.key}.png`),
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(box.width, 1600 - box.x),
        height: Math.min(box.height, 1000 - box.y),
      },
    });
    for (const im of box.imgs || []) {
      if (im.src) assets.push(im.src);
    }
    for (const b of box.bgs || []) {
      assets.push(...extractBgUrls(b.bg));
    }
  }
}

const unique = [...new Set(assets)].filter((u) => u && u.startsWith("http"));
console.log("asset urls", unique.length);
let i = 0;
for (const u of unique) {
  i++;
  try {
    const res = await page.request.get(u);
    if (!res.ok()) continue;
    const buf = Buffer.from(await res.body());
    const ext = u.includes(".svg")
      ? "svg"
      : u.includes(".png")
        ? "png"
        : u.includes(".webp")
          ? "webp"
          : "jpg";
    const name = `asset-${i}.${ext}`;
    fs.writeFileSync(path.join(outDir, name), buf);
    console.log("saved", name, buf.length, u.slice(0, 120));
  } catch (e) {
    console.log("fail", u, e.message);
  }
}

await browser.close();
console.log("done");
