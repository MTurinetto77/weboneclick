import { chromium } from "playwright";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const OUT = path.join(process.cwd(), "public", "oneclick");

async function save(request, url, dest) {
  const res = await request.get(url);
  if (!res.ok()) throw new Error(`${res.status()} ${url}`);
  await writeFile(dest, await res.body());
  console.log("OK", path.basename(dest));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://www.oneclickstore.com/", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(3500);

  const assets = [
    ["https://www.oneclickstore.com/wp-content/uploads/2026/06/logo-mundial.svg", "logo.svg"],
    [
      "https://www.oneclickstore.com/wp-content/smush-webp/2026/06/precio-neo-cuotas.png.webp",
      "precio-neo.webp",
    ],
    ["https://www.oneclickstore.com/wp-content/uploads/2026/06/recurso-2.webp", "mundial-strip.webp"],
  ];

  for (const [url, name] of assets) {
    try {
      await save(page.request, url, path.join(OUT, name));
    } catch (e) {
      console.warn("skip", name, e.message);
    }
  }

  // Capture hero as cropped viewport screenshot for background fallback
  await page.screenshot({
    path: path.join(OUT, "hero-live.jpg"),
    clip: { x: 0, y: 70, width: 1440, height: 520 },
    type: "jpeg",
    quality: 85,
  });
  console.log("OK hero-live.jpg");

  // Extract largest background image URLs
  const bgs = await page.evaluate(() => {
    const urls = new Set();
    for (const n of document.querySelectorAll("*")) {
      const bg = getComputedStyle(n).backgroundImage;
      if (!bg || bg === "none") continue;
      const m = /url\(["']?(.*?)["']?\)/.exec(bg);
      if (m?.[1]) urls.add(m[1].startsWith("//") ? `https:${m[1]}` : m[1]);
    }
    return [...urls];
  });
  console.log("bg count", bgs.length);
  let i = 0;
  for (const url of bgs) {
    if (!/wp-content|uploads|cdn/i.test(url)) continue;
    i += 1;
    const ext = url.includes(".webp")
      ? ".webp"
      : url.includes(".jpg") || url.includes(".jpeg")
        ? ".jpg"
        : url.includes(".png")
          ? ".png"
          : ".bin";
    try {
      await save(page.request, url, path.join(OUT, `bg-${i}${ext}`));
    } catch (e) {
      console.warn("bg skip", e.message);
    }
    if (i >= 8) break;
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
