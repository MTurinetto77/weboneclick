import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("https://www.oneclickstore.com/", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(3500);

  // Right half of hero (product photo, less text)
  await page.screenshot({
    path: "public/oneclick/hero-mac.jpg",
    clip: { x: 620, y: 60, width: 820, height: 560 },
    type: "jpeg",
    quality: 88,
  });
  console.log("OK hero-mac.jpg");

  // Full width but we'll use as bg under dark left gradient only
  await page.screenshot({
    path: "public/oneclick/hero-full-raw.jpg",
    clip: { x: 0, y: 60, width: 1440, height: 560 },
    type: "jpeg",
    quality: 88,
  });
  console.log("OK hero-full-raw.jpg");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
