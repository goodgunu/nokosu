import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchCarsensorListing } from "@/lib/fetch-listing";
import { parseLineAction } from "@/lib/line-picker";
import { carsensorTargetsFromText } from "@/lib/share-text";
import { saveKeptListing } from "@/lib/save-kept";
import { getRecord, putRecord } from "@/lib/store";
import { createLineLoginLink, lineAccountId } from "@/lib/line-login";
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

export async function replyForText(text: string, origin: string, lineUserId: string): Promise<LineReply> {
  const targets = carsensorTargetsFromText(text).slice(0, 1);
  if (!targets.length) {
    const link = await createLineLoginLink(origin, lineUserId, "/");
    return linkMessage("このリンクを開くと、あなたの車のページに入れます。", "サインイン", link);
  }
  return replyForListingUrl(targets[0], origin, lineUserId);
}

export async function welcomeReply(origin: string, lineUserId: string): Promise<LineReply> {
  const link = await createLineLoginLink(origin, lineUserId, "/");
  return linkMessage(
    "友だち追加ありがとうございます。\n\nカーセンサー公式アプリで気になる車を開いたら、共有からこの「のこす」を選んでください。下のボタンを開くと、あなたの車のページに入れます。",
    "サインイン",
    link,
  );
}

export async function replyForAction(data: string, origin: string): Promise<LineReply> {
  const action = parseLineAction(data);
  if (!action) return textOnly("残す写真は、送られてきたページで選んでください。");
  return textOnly(`残す写真は、このページで選んでください。\n${pickPageUrl(origin, action.id)}`);
}

async function replyForListingUrl(target: string, origin: string, lineUserId: string): Promise<LineReply> {
  const fetched = await fetchCarsensorListing(target);
  if (fetched.parsed.status === "error") return textOnly(fetched.parsed.message);
  if (fetched.parsed.status === "ended") {
    const account = lineAccountId(lineUserId);
    const existing = await getRecord(account, fetched.parsed.id);
    if (existing) {
      const now = new Date().toISOString();
      await putRecord(account, { ...existing, availability: "ended", lastCheckedAt: now, updatedAt: now });
      const link = await createLineLoginLink(origin, lineUserId, `/listings/${fetched.parsed.id}`);
      return linkMessage(`「${trimTitle(fetched.parsed.title)}」は掲載が終わっていました。以前残した内容は、このページで見られます。`, "車を見る", link);
    }
    return textOnly(`「${trimTitle(fetched.parsed.title)}」はすでに掲載が終わっていて、新しくは残せません。`);
  }

  const listing = fetched.parsed.listing;
  const account = lineAccountId(lineUserId);
  const previous = await getRecord(account, listing.id);
  await saveKeptListing(account, listing, previous?.photoCount ? null : []);
  const link = await createLineLoginLink(origin, lineUserId, `/listings/${listing.id}?pick=1`);
  return linkMessage(
    `${trimTitle(listing.title)}を読み取りました。下のボタンを開くと、このアカウントで写真を選べます。`,
    "写真を選ぶ",
    link,
  );
}

function textOnly(text: string): LineReply {
  return { messages: [{ type: "text", text }], push: [] };
}

function linkMessage(text: string, label: string, link: string): LineReply {
  return {
    messages: [
      { type: "text", text: `${text}\n${link}` },
      {
        type: "template",
        altText: label,
        template: {
          type: "buttons",
          text: label === "写真を選ぶ" ? "残す写真を、ページで選びます。" : "あなたの車のページを開きます。",
          actions: [{ type: "uri", label, uri: link }],
        },
      },
    ],
    push: [],
  };
}

export function pickPageUrl(origin: string, id: string): string {
  return `${origin}/listings/${id}?pick=1`;
}

function trimTitle(title: string): string {
  const compact = title.replace(/\s+/g, " ").trim();
  return compact.length > 40 ? `${compact.slice(0, 40)}…` : compact || "この車";
}
