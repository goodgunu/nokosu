import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchCarsensorListing } from "@/lib/fetch-listing";
import { parseLineAction, photoPickerMessages, togglePick, type LineMessage } from "@/lib/line-picker";
import { carsensorTargetsFromText } from "@/lib/share-text";
import { saveKeptListing } from "@/lib/save-kept";
import { getRecord, isListingId, putRecord, readAppJson, writeAppJson } from "@/lib/store";
import type { ParsedListing } from "@/lib/types";

type LineDraft = {
  listing: ParsedListing;
  selected: number[];
};

export type LineReply = {
  messages: LineMessage[];
  push: LineMessage[];
};

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

export async function replyForText(text: string, origin: string): Promise<LineReply> {
  const targets = carsensorTargetsFromText(text).slice(0, 1);
  if (!targets.length) {
    return textOnly("カーセンサーの車両ページを、このトークに共有してください。URLが入っていれば、残す写真を選べます。");
  }
  return replyForListingUrl(targets[0], origin);
}

export async function replyForAction(data: string, origin: string): Promise<LineReply> {
  const action = parseLineAction(data);
  if (!action) return textOnly("その操作は受け取れませんでした。もう一度、写真を押してください。");
  const draft = await readDraft(action.id);
  if (!draft) return textOnly("この車の写真選択は見つかりません。車両ページをもう一度共有してください。");

  if (action.type === "clear") {
    await writeDraft({ listing: draft.listing, selected: [] });
    const picker = photoPickerMessages(origin, draft.listing, 0);
    picker.reply[0].text = "選択をやり直しました。残したい写真を押してください。";
    return { messages: picker.reply.slice(0, 1), push: [] };
  }

  if (action.type === "save") {
    const saved = await saveKeptListing(draft.listing, [...draft.selected].sort((a, b) => a - b));
    const name = trimTitle(draft.listing.title);
    const note = saved.record.photoCount
      ? `写真は${saved.record.photoCount}枚残しました。`
      : "写真は残していません。掲載内容だけ残しました。";
    return textOnly(`${name}を残しました。${note}\n${origin}/listings/${saved.record.id}`);
  }

  const next = togglePick(draft.selected, action.index, draft.listing.photos.length);
  await writeDraft({ listing: draft.listing, selected: next.selected });
  const photo = draft.listing.photos[action.index];
  const label = photo?.caption || photo?.category || `${action.index + 1}枚目`;
  const status = next.full
    ? "1台につき40枚までです。"
    : next.added
      ? `「${trimTitle(label)}」を残す写真に入れました。`
      : `「${trimTitle(label)}」を外しました。`;
  const picker = photoPickerMessages(origin, draft.listing, next.selected.length);
  picker.reply[0].text = `${status}いま${next.selected.length}枚です。選び終えたら下の「これで残す」を押してください。`;
  return { messages: picker.reply.slice(0, 1), push: [] };
}

async function replyForListingUrl(target: string, origin: string): Promise<LineReply> {
  const fetched = await fetchCarsensorListing(target);
  if (fetched.parsed.status === "error") return textOnly(fetched.parsed.message);
  if (fetched.parsed.status === "ended") {
    const existing = await getRecord(fetched.parsed.id);
    if (existing) {
      const now = new Date().toISOString();
      await putRecord({ ...existing, availability: "ended", lastCheckedAt: now, updatedAt: now });
      return textOnly(`「${trimTitle(fetched.parsed.title)}」は掲載が終わっていました。以前残した内容はそのまま見られます。\n${origin}/listings/${fetched.parsed.id}`);
    }
    return textOnly(`「${trimTitle(fetched.parsed.title)}」はすでに掲載が終わっていて、新しくは残せません。`);
  }

  const listing = fetched.parsed.listing;
  const previous = await getRecord(listing.id);
  await saveKeptListing(listing, previous?.photoCount ? null : []);
  await writeDraft({ listing, selected: [] });
  const picker = photoPickerMessages(origin, listing, 0);
  return { messages: picker.reply, push: picker.push };
}

async function readDraft(id: string): Promise<LineDraft | null> {
  if (!isListingId(id)) return null;
  const draft = await readAppJson<LineDraft>(`drafts/${id}.json`);
  if (!draft?.listing || !Array.isArray(draft.selected)) return null;
  return draft;
}

async function writeDraft(draft: LineDraft): Promise<void> {
  await writeAppJson(`drafts/${draft.listing.id}.json`, draft);
}

function textOnly(text: string): LineReply {
  return { messages: [{ type: "text", text }], push: [] };
}

function trimTitle(title: string): string {
  const compact = title.replace(/\s+/g, " ").trim();
  return compact.length > 40 ? `${compact.slice(0, 40)}…` : compact || "この車";
}
