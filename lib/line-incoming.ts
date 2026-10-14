import { canonicalCarsensorUrl } from "@/lib/carsensor-url";
import { fetchCarsensorListing } from "@/lib/fetch-listing";
import { flexCard, listingMeta, signedMan, textCard, tokyoStamp } from "@/lib/line-card";
import { textOnly, type LineReply } from "@/lib/line-archive";
import { linkedEmail } from "@/lib/line-link";
import { createLineConnectLink } from "@/lib/line-login";
import type { LineMessage } from "@/lib/line-picker";
import { priceChange } from "@/lib/price-history";
import { recordFromListing, saveKeptListing } from "@/lib/save-kept";
import { carsensorTargetsFromText, shareCarName } from "@/lib/share-text";
import { getRecord, putRecord } from "@/lib/store";
import type { ArchiveRecord, ParsedListing } from "@/lib/types";

export const AUTO_PHOTO_KEEP = 12;

export function welcomeReply(): LineReply {
  return textOnly(
    "友だち追加ありがとうございます。\n\nカーセンサー公式アプリで気になる車を開いたら、共有からこの「のこす」を選んでください。最初の1回だけアカウントをつなぐと、次からは送るだけで保存されます。",
  );
}

export async function replyForIncoming(input: {
  text?: string;
  postback?: string;
  lineUserId?: string;
  origin: string;
  now?: Date;
}): Promise<LineReply> {
  const retry = input.postback?.startsWith("retry=") ? input.postback.slice("retry=".length) : "";
  const text = retry || input.text || "";
  const targets = carsensorTargetsFromText(text).slice(0, 1);
  if (!targets.length) return one(textCard("カーセンサーの車の詳細ページを送ってください", "カーセンサーの車の詳細ページを送ってください。"));
  const url = targets[0];
  const shareName = shareCarName(text);
  if (!input.lineUserId) {
    return one(textCard("まだ保存されていません", "まだ保存されていません。\nこのトークで、もう一度送ってください。"));
  }
  const email = await linkedEmail(input.lineUserId);
  if (!email) {
    const connectUrl = await createLineConnectLink(input.origin, input.lineUserId, url);
    return one(
      textCard(
        "まだ保存されていません",
        "まだ保存されていません。\n最初の1回だけ、のこすのアカウントとつないでください。次からは送るだけで保存されます。",
        { label: "アカウントをつないで保存", uri: connectUrl },
      ),
    );
  }
  return saveAndReply({ email, url, shareName, origin: input.origin, now: input.now });
}

export async function saveAndReply(input: {
  email: string;
  url: string;
  shareName?: string;
  origin: string;
  now?: Date;
}): Promise<LineReply> {
  const now = input.now ?? new Date();
  const { parsed } = await fetchCarsensorListing(input.url);
  if (parsed.status === "error") {
    return one(
      textCard("読み込めませんでした", "読み込めませんでした。少し待ってからもう一度送ってください。", {
        label: "もう一度試す",
        data: `retry=${input.url}`.slice(0, 300),
      }),
    );
  }
  if (parsed.status === "ended") {
    const id = canonicalCarsensorUrl(input.url)?.id || parsed.id;
    const existing = await getRecord(input.email, id);
    if (!existing) {
      return one(
        textCard(
          "保存できませんでした",
          "保存できませんでした。\nこの車はカーセンサーで掲載が終わっています。掲載中の車の詳細ページから送ってください。",
        ),
      );
    }
    const iso = now.toISOString();
    const next: ArchiveRecord = { ...existing, availability: "ended", lastCheckedAt: iso, updatedAt: iso, checkAttemptAt: undefined };
    await putRecord(input.email, next);
    return one(cardMessage({
      origin: input.origin,
      head: "保存済み ・ 掲載が終わりました",
      tone: "alert",
      record: next,
      shareName: input.shareName,
      meta: listingMeta(next),
      primaryLabel: "残っている記録を見る",
      primaryPath: `/listings/${next.id}`,
    }));
  }
  const listing = parsed.listing;
  const existing = await getRecord(input.email, listing.id);
  if (!existing) {
    const indexes = autoIndexes(listing.photos.length);
    const saved = await saveKeptListing(input.email, listing, indexes);
    return one(savedMessage(input.origin, listing, saved.record, input.shareName));
  }
  const next = recordFromListing(listing, existing, existing.savedPhotos, "live");
  next.photoCount = existing.photoCount;
  next.savedPhotos = existing.savedPhotos;
  next.lastCheckedAt = now.toISOString();
  await putRecord(input.email, next);
  return one(updatedMessage(input.origin, listing, next, input.shareName, now));
}

export function savedMessage(origin: string, listing: ParsedListing, record: ArchiveRecord, shareName?: string): LineMessage {
  return cardMessage({
    origin,
    head: "保存しました",
    tone: "ok",
    listing,
    record,
    shareName,
    meta: listingMeta(record),
    primaryLabel: "のこすで見る",
    primaryPath: `/listings/${record.id}`,
  });
}

export function updatedMessage(origin: string, listing: ParsedListing | null, record: ArchiveRecord, shareName?: string, now = new Date()): LineMessage {
  const change = priceChange(record);
  const points = record.priceHistory ?? [];
  const latest = points[points.length - 1];
  const before = points[points.length - 2];
  const delta = latest?.priceYen != null && before?.priceYen != null ? latest.priceYen - before.priceYen : null;
  if (change.kind !== "same" && delta) {
    const previous = tokyoStamp(before.at, now);
    return cardMessage({
      origin,
      head: delta < 0 ? "保存済み ・ 前回から値下がり" : "保存済み ・ 前回から値上がり",
      tone: "alert",
      listing,
      record,
      shareName,
      priceNote: signedMan(delta),
      meta: `${previous.monthDay} の ${before.totalPrice || change.previous} から変更`,
      primaryLabel: "のこすで見る",
      primaryPath: `/listings/${record.id}`,
    });
  }
  const saved = tokyoStamp(record.savedAt, now);
  const checked = tokyoStamp(record.lastCheckedAt, now);
  return cardMessage({
    origin,
    head: "保存済みの車です ・ 変更なし",
    tone: "muted",
    listing,
    record,
    shareName,
    meta: `${saved.monthDay} に保存 ・ ${checked.today ? `今日 ${checked.clock}` : checked.monthDay} に確認`,
    primaryLabel: "のこすで見る",
    primaryPath: `/listings/${record.id}`,
  });
}

function cardMessage(input: Parameters<typeof flexCard>[0]): LineMessage {
  return flexCard(input);
}

function autoIndexes(length: number): number[] {
  return Array.from({ length: Math.min(AUTO_PHOTO_KEEP, length) }, (_, index) => index);
}

function one(message: LineMessage): LineReply {
  return { messages: [message], push: [] };
}
