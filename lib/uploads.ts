import "server-only";
import sharp from "sharp";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { cleanText } from "@/lib/utils";

export type ProcessedFile = { buffer: Buffer; contentType: string; ext: string; fileName: string };

export class UploadError extends Error {}

/** Detecta o tipo real pelos "magic bytes" — nunca confia na extensão nem no MIME enviado. */
function sniff(buf: Buffer): "jpeg" | "png" | "webp" | "pdf" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  return null;
}

function safeName(name: string, ext: string) {
  const base = cleanText(name).replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 80) || "arquivo";
  return `${base}.${ext}`;
}

export async function processUpload(file: File): Promise<ProcessedFile> {
  if (file.size === 0) throw new UploadError("Arquivo vazio.");
  if (file.size > MAX_FILE_SIZE) throw new UploadError("Arquivo maior que 4 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const kind = sniff(input);
  if (!kind) throw new UploadError("Formato não permitido. Use JPG, PNG, WEBP ou PDF.");

  if (kind === "pdf") {
    return { buffer: input, contentType: "application/pdf", ext: "pdf", fileName: safeName(file.name, "pdf") };
  }

  try {
    // rotate() aplica a orientação EXIF; o sharp descarta metadados (EXIF/GPS) por padrão.
    const buffer = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { buffer, contentType: "image/webp", ext: "webp", fileName: safeName(file.name, "webp") };
  } catch {
    throw new UploadError("Imagem inválida ou corrompida.");
  }
}
