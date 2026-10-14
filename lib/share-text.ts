import { canonicalCarsensorUrl } from "@/lib/carsensor-url";

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

export function shareCarName(text: string): string {
  const match = text.replace(/\s+/g, " ").match(/(.+?)の物件情報/u);
  if (!match) return "";
  return match[1].replace(/^[\s「」]+/u, "").trim().slice(0, 80);
}

export function carsensorTargetsFromText(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.match(URL_PATTERN) ?? []) {
    const cleaned = match.replace(/[)）,。】]+$/u, "");
    const direct = canonicalCarsensorUrl(cleaned);
    if (direct) found.add(direct.url);
  }
  for (const match of text.match(/\bAU\d{6,16}\b/gi) ?? []) {
    const direct = canonicalCarsensorUrl(match);
    if (direct) found.add(direct.url);
  }
  return [...found];
}

export function defaultKeepIndexes(photos: { caption: string; category: string }[], limit = 12): number[] {
  return photos
    .map((photo, index) => ({
      index,
      rank: photo.caption ? 0 : photo.category ? 1 : 2,
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.index)
    .sort((a, b) => a - b);
}
