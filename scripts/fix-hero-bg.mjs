import { chromium } from "playwright";
import { writeFile } from "fs/promises";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://www.oneclickstore.com/", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(4000);

  // Hide text overlays in hero then screenshot clean background
  await page.addStyleTag({
    content: `
      header, .wd-header, .whb-header { opacity: 0 !important; }
      /* hide likely text nodes over hero */
      h1, h2, .elementor-heading-title, .wd-entities-title { visibility: hidden !important; }
    `,
  });

  // Find largest image-like section near top
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img, source, video")].map((el) => {
      const src =
        el instanceof HTMLImageElement
          ? el.currentSrc || el.src
          : el instanceof HTMLSourceElement
            ? el.srcset || el.src
            : (el as HTMLVideoElement).currentSrc || (el as HTMLVideoElement).src;
      return { tag: el.tagName, src, w: (el as HTMLImageElement).naturalWidth || 0 };
    });
    const bgs = [];
    for (const n of document.querySelectorAll("section, div, .banner, .slider")) {
      const r = n.getBoundingClientRect();
      if (r.top > 700 || r.height < 200) continue;
      const bg = getComputedStyle(n).backgroundImage;
      if (bg && bg.includes("url(")) {
        bgs.push({
          top: r.top,
          h: r.height,
          w: r.width,
          bg,
          cls: n.className?.toString?.().slice(0, 80),
        });
      }
    }
    return { imgs: imgs.filter((i) => i.w > 400 || /banner|hero|slide|neo|aguinaldo/i.test(i.src)).slice(0, 20), bgs: bgs.slice(0, 15) };
  });
  console.log(JSON.stringify(info, null, 2));

  // Screenshot only right half of hero area (product photo, less text)
  await page.screenshot({
    path: "public/oneclick/hero-bg-clean.jpg",
    clip: { x: 0, y: 0, width: 1440, height: 620 },
    type: "jpeg",
    quality: 90,
  });

  // Also try to download any large bg urls
  for (const item of info.bgs) {
    const m = /url\(["']?(.*?)["']?\)/.exec(item.bg);
    if (!m) continue;
    let u = m[1];
    if (u.startsWith("//")) u = "https:" + u;
    try {
      const res = await page.request.get(u);
      if (!res.ok()) continue;
      const buf = await res.body();
      if (buf.length < 20000) continue;
      const name = `hero-bg-${buf.length}.webp`;
      await writeFile(`public/oneclick/${name}`, buf);
      console.log("saved", name, buf.length);
    } catch {}
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
