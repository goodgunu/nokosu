// 写真の種類を決める。サイトによっては、古い写真が image/ ではなく
// application/octet-stream で返ってくる（カババ）。その場合は中身の先頭バイトで判定する。
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

// 返ってきた content-type と中身から、使う content-type を返す。写真でなければ null
export function resolveImageType(contentType: string, bytes: Uint8Array): string | null {
  const declared = contentType.split(";")[0].trim().toLowerCase();
  const sniffed = sniffImageType(bytes);
  if (declared.startsWith("image/")) return declared;
  if (!declared || declared === "application/octet-stream" || declared === "binary/octet-stream") return sniffed;
  return null;
}
