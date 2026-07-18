import https from "https";
import fs from "fs";
import path from "path";

function get(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

const assets: [string, string][] = [
  ["public/oneclick/st/iphone.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/iphone_st_lan.png.webp"],
  ["public/oneclick/st/mac.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/mac_st_lan.png.webp"],
  ["public/oneclick/st/ipad.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/ipad_st_lan.png.webp"],
  ["public/oneclick/st/watch.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/watch_st_lan.png.webp"],
  ["public/oneclick/st/airpods.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/airpods_st_lan.png.webp"],
  ["public/oneclick/st/appletv.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/appletv_st_lan.png.webp"],
  ["public/oneclick/st/beats.png", "https://www.oneclickstore.com/wp-content/smush-webp/2025/08/beats_st_lan.png.webp"],
];

async function main() {
  for (const [dest, url] of assets) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const buf = await get(url);
    fs.writeFileSync(dest, buf);
    console.log("ok", dest, buf.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
