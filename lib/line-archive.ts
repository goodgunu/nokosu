import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchCarsensorListing } from "@/lib/fetch-listing";
import { parseLineAction } from "@/lib/line-picker";
import { carsensorTargetsFromText } from "@/lib/share-text";
import { saveKeptListing } from "@/lib/save-kept";
import { getOwner, getRecord, putRecord } from "@/lib/store";
import type { LineMessage } from "@/lib/line-picker";

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
  if (!action) return textOnly("残す写真は、送られてきたページで選んでください。");
  return textOnly(`残す写真は、このページで選んでください。\n${pickPageUrl(origin, action.id)}`);
}

async function replyForListingUrl(target: string, origin: string): Promise<LineReply> {
  const fetched = await fetchCarsensorListing(target);
  if (fetched.parsed.status === "error") return textOnly(fetched.parsed.message);
  if (fetched.parsed.status === "ended") {
    const owner = await getOwner();
    if (!owner) return textOnly("先に、のこすをGoogleアカウントで開いてください。");
    const existing = await getRecord(owner.email, fetched.parsed.id);
    if (existing) {
      const now = new Date().toISOString();
      await putRecord(owner.email, { ...existing, availability: "ended", lastCheckedAt: now, updatedAt: now });
      return textOnly(`「${trimTitle(fetched.parsed.title)}」は掲載が終わっていました。以前残した内容はそのまま見られます。\n${origin}/listings/${fetched.parsed.id}`);
    }
    return textOnly(`「${trimTitle(fetched.parsed.title)}」はすでに掲載が終わっていて、新しくは残せません。`);
  }

  const listing = fetched.parsed.listing;
  const owner = await getOwner();
  if (!owner) return textOnly("先に、のこすをGoogleアカウントで開いてください。");
  const previous = await getRecord(owner.email, listing.id);
  await saveKeptListing(owner.email, listing, previous?.photoCount ? null : []);
  return textOnly(
    `${trimTitle(listing.title)}を読み取りました。残す写真は、このページで選んでください。\n${pickPageUrl(origin, listing.id)}`,
  );
}

function textOnly(text: string): LineReply {
  return { messages: [{ type: "text", text }], push: [] };
}

export function pickPageUrl(origin: string, id: string): string {
  return `${origin}/listings/${id}?pick=1`;
}

function trimTitle(title: string): string {
  const compact = title.replace(/\s+/g, " ").trim();
  return compact.length > 40 ? `${compact.slice(0, 40)}…` : compact || "この車";
}
