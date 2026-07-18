import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const OUT = path.join(process.cwd(), "public", "oneclick", "compare");

async function shot(page, url, name) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(OUT, `${name}-full.png`),
    fullPage: true,
  });
  await page.screenshot({
    path: path.join(OUT, `${name}-viewport.png`),
    fullPage: false,
  });
  console.log("saved", name);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await shot(page, "https://www.oneclickstore.com/", "live");
  await shot(page, "http://localhost:3000/", "local");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
