import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FormError } from "@/lib/form";

const MAX_BYTES = 5 * 1024 * 1024;

// Detect the real file type from its first bytes - never trust the file name or browser type.
// SVG is intentionally NOT allowed (it can carry scripts).
function sniff(buf: Buffer): "jpg" | "png" | "webp" | "gif" | "avif" | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  if (buf.subarray(0, 4).toString() === "GIF8") return "gif";
  if (buf.subarray(4, 12).toString() === "ftypavif") return "avif";
  return null;
}

/**
 * Saves an uploaded image under /public/uploads and returns its public URL.
 * NOTE: for production on serverless hosting, swap this for external storage (S3 / R2 / Cloudinary).
 */
export async function saveImage(file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new FormError("התמונה גדולה מ-5MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) throw new FormError("סוג קובץ לא נתמך. מותר: JPG, PNG, WEBP, GIF, AVIF");
  const month = new Date().toISOString().slice(0, 7);
  const dir = path.join(process.cwd(), "public", "uploads", month);
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), buf, { flag: "wx" });
  return `/uploads/${month}/${name}`;
}
