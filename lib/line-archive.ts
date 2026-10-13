import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchCarsensorListing } from "@/lib/fetch-listing";
import { carsensorTargetsFromText, defaultKeepIndexes } from "@/lib/share-text";
import { saveKeptListing } from "@/lib/save-kept";
import { getRecord, putRecord } from "@/lib/store";

export function lineSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

export function validLineSignature(body: string, secret: string, header: string): boolean {
  const expected = lineSignature(body, secret);
  const actual = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

export async function archiveSharedText(text: string, origin: string): Promise<string> {
  const targets = carsensorTargetsFromText(text).slice(0, 3);
  if (!targets.length) {
    return "カーセンサーの車両ページを、このトークに共有してください。URLが入っていれば、のこすに残します。";
  }

  const lines: string[] = [];
  for (const target of targets) {
    lines.push(await archiveOne(target, origin));
  }
  return lines.join("\n\n");
}

async function archiveOne(target: string, origin: string): Promise<string> {
  const parsed = await fetchCarsensorListing(target);
  if (parsed.parsed.status === "error") return parsed.parsed.message;
  if (parsed.parsed.status === "ended") {
    const existing = await getRecord(parsed.parsed.id);
    if (existing) {
      const now = new Date().toISOString();
      await putRecord({ ...existing, availability: "ended", lastCheckedAt: now, updatedAt: now });
      return `「${trimTitle(parsed.parsed.title)}」は掲載が終わっていました。以前残した内容はそのまま見られます。\n${origin}/listings/${parsed.parsed.id}`;
    }
    return `「${trimTitle(parsed.parsed.title)}」はすでに掲載が終わっていて、新しくは残せません。`;
  }

  const listing = parsed.parsed.listing;
  const previous = await getRecord(listing.id);
  const indexes = previous?.photoCount ? null : defaultKeepIndexes(listing.photos);
  const saved = await saveKeptListing(listing, indexes);
  const name = trimTitle(listing.title);
  const photoNote = indexes
    ? `写真は${saved.record.photoCount}枚入れてあります。のこすで入れ替えできます。`
    : "内容を更新しました。写真は今のままです。";
  return `${name}を残しました。${photoNote}\n${origin}/listings/${saved.record.id}`;
}

function trimTitle(title: string): string {
  const compact = title.replace(/\s+/g, " ").trim();
  return compact.length > 40 ? `${compact.slice(0, 40)}…` : compact || "この車";
}
