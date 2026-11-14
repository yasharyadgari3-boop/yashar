export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export type DetectedFile = { mime: "application/pdf" | "image/jpeg" | "image/png"; ext: "pdf" | "jpg" | "png" };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((b, i) => bytes[i] === b);
}

/** Detect the real file type from its first bytes; the browser-supplied name and type are not trusted. */
export function detectFileType(bytes: Uint8Array): DetectedFile | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  return null;
}

export type UploadCheck = { ok: true; file: DetectedFile } | { ok: false; message: string };

/** `allow` limits the accepted types (documents: PDF/JPG/PNG; product images: JPG/PNG). */
export function checkUpload(bytes: Uint8Array, allow: ReadonlyArray<DetectedFile["ext"]> = ["pdf", "jpg", "png"]): UploadCheck {
  if (bytes.length === 0) return { ok: false, message: "فایل انتخاب نشده است." };
  if (bytes.length > MAX_DOCUMENT_BYTES) return { ok: false, message: "حجم فایل باید کمتر از ۵ مگابایت باشد." };
  const file = detectFileType(bytes);
  if (!file || !allow.includes(file.ext)) {
    return { ok: false, message: `فقط فایل ${allow.map((e) => e.toUpperCase()).join("، ")} پذیرفته می‌شود.` };
  }
  return { ok: true, file };
}

/** Keep only a safe, short display name for the original file name. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\u007f/\\]/g, "").trim().slice(0, 120);
  return cleaned || "file";
}
