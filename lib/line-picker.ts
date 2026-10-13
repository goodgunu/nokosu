import { PHOTO_KEEP_LIMIT } from "@/lib/keep-photos";
import type { ParsedListing } from "@/lib/types";

export type LineAction =
  | { type: "pick"; id: string; index: number }
  | { type: "save"; id: string }
  | { type: "clear"; id: string };

export type LineMessage = {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: unknown;
  quickReply?: unknown;
};

const PER_CAROUSEL = 12;
const REPLY_CAROUSELS = 4;
const PUSH_CAROUSELS = 5;

export function parseLineAction(data: string): LineAction | null {
  const pick = data.match(/^pick=(AU\d{6,16}):(\d+)$/);
  if (pick) return { type: "pick", id: pick[1], index: Number(pick[2]) };
  const save = data.match(/^save=(AU\d{6,16})$/);
  if (save) return { type: "save", id: save[1] };
  const clear = data.match(/^clear=(AU\d{6,16})$/);
  if (clear) return { type: "clear", id: clear[1] };
  return null;
}

export function togglePick(selected: number[], index: number, length: number): { selected: number[]; added: boolean; full: boolean } {
  if (!Number.isInteger(index) || index < 0 || index >= length) return { selected, added: false, full: false };
  if (selected.includes(index)) return { selected: selected.filter((item) => item !== index), added: false, full: false };
  if (selected.length >= PHOTO_KEEP_LIMIT) return { selected, added: false, full: true };
  return { selected: [...selected, index], added: true, full: false };
}

export function photoPickerMessages(origin: string, listing: ParsedListing, selectedCount: number): { reply: LineMessage[]; push: LineMessage[] } {
  const shown = listing.photos.slice(0, (REPLY_CAROUSELS + PUSH_CAROUSELS) * PER_CAROUSEL);
  const carousels = chunk(shown.map((photo, index) => bubble(origin, listing.id, photo, index)), PER_CAROUSEL).map(
    (group, groupIndex) => carousel(listing.title, group, groupIndex),
  );
  const extra = listing.photos.length > shown.length ? `\n掲載写真が多いので、先頭の${shown.length}枚から選べます。` : "";
  const text: LineMessage = {
    type: "text",
    text: `${trim(listing.title)}を読み取りました。残したい写真を押してください。もう一度押すと外れます。いま${selectedCount}枚です。選び終えたら下の「これで残す」を押してください。${extra}`,
    quickReply: {
      items: [
        {
          type: "action",
          action: { type: "postback", label: "これで残す", data: `save=${listing.id}`, displayText: "これで残す" },
        },
        {
          type: "action",
          action: { type: "postback", label: "選択をやり直す", data: `clear=${listing.id}`, displayText: "選択をやり直す" },
        },
      ],
    },
  };
  if (!carousels.length) {
    text.text = `${trim(listing.title)}の掲載内容は残しました。この掲載からは写真を取れませんでした。\n${origin}/listings/${listing.id}`;
    delete text.quickReply;
  }
  return {
    reply: [text, ...carousels.slice(0, REPLY_CAROUSELS)],
    push: carousels.slice(REPLY_CAROUSELS, REPLY_CAROUSELS + PUSH_CAROUSELS),
  };
}

function bubble(origin: string, id: string, photo: ParsedListing["photos"][number], index: number) {
  const label = (photo.caption || photo.category || `${index + 1}枚目`).slice(0, 40);
  return {
    type: "bubble",
    hero: {
      type: "image",
      url: `${origin}/api/line-photo?url=${encodeURIComponent(photo.url)}`,
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
      action: { type: "postback", label: "残す", data: `pick=${id}:${index}`, displayText: label },
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "8px",
      contents: [{ type: "text", text: label, size: "xs", wrap: true, maxLines: 3 }],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          height: "sm",
          action: { type: "postback", label: "残す", data: `pick=${id}:${index}`, displayText: label },
        },
      ],
    },
  };
}

function carousel(title: string, bubbles: unknown[], groupIndex: number): LineMessage {
  return {
    type: "flex",
    altText: `${trim(title)}の写真 ${groupIndex + 1}`,
    contents: { type: "carousel", contents: bubbles },
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

function trim(title: string): string {
  const compact = title.replace(/\s+/g, " ").trim();
  return compact.length > 40 ? `${compact.slice(0, 40)}…` : compact || "この車";
}
