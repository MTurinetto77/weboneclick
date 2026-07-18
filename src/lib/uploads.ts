import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/** Raíz de uploads acotada a una subcarpeta del proyecto (evita NFT de todo el cwd). */
export function getUploadsRoot() {
  const configured = process.env.UPLOADS_DIR || "uploads";
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), configured);
}

export async function saveUploadedFile(file: File, folder = "productos") {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name || "").toLowerCase() || ".jpg";
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
  const relative = path.posix.join(folder, `${randomUUID()}${safeExt}`);
  const absolute = path.join(getUploadsRoot(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return relative.replace(/\\/g, "/");
}

export async function deleteUploadedFile(relativeLink: string) {
  if (!relativeLink || relativeLink.startsWith("http")) return;
  const absolute = path.join(getUploadsRoot(), relativeLink);
  try {
    await unlink(absolute);
  } catch {
    // ignore missing files
  }
}
