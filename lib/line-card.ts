import { factValue, vehicleHeading } from "@/lib/format";
import type { LineMessage } from "@/lib/line-picker";
import type { ArchiveRecord, ParsedListing } from "@/lib/types";

const ORANGE = "#E4682C";
const BUTTON = "#C14F18";
const OK = "#008A00";
const ALERT = "#C62828";
const MUTED = "#666666";

function stripe(): Record<string, unknown> {
  return { type: "box", layout: "vertical", paddingAll: "4px", backgroundColor: ORANGE, contents: [{ type: "filler" }] };
}

export type LineCardInput = {
  origin: string;
  head: string;
  tone: "ok" | "alert" | "muted";
  listing?: ParsedListing | null;
  record?: ArchiveRecord | null;
  shareName?: string;
  priceNote?: string;
  meta: string;
  primaryLabel: string;
  primaryPath: string;
  secondaryLabel?: string;
  secondaryPath?: string;
};

export function flexCard(input: LineCardInput): LineMessage {
  const record = input.record;
  const listing = input.listing;
  const heading = record
    ? vehicleHeading(record)
    : listing
      ? vehicleHeading({ ...listing, highlights: listing.highlights, sections: listing.sections })
      : { maker: "", heading: input.shareName || "車", subline: "" };
  const name = heading.heading || input.shareName || "車";
  const priceSource = record?.totalPrice || record?.basePrice || listing?.totalPrice || listing?.basePrice || "";
  const priceYen = record?.priceYen ?? listing?.priceYen ?? null;
  const price = manDisplay(priceSource, priceYen);
  const photo = listing?.photos[0]?.url;
  const photoUrl = photo ? `${input.origin}/api/line-photo?url=${encodeURIComponent(photo)}` : "";
  const primary = absolute(input.origin, input.primaryPath);
  const secondary = input.secondaryPath ? absolute(input.origin, input.secondaryPath) : "";
  const body: Record<string, unknown>[] = [
    { type: "text", text: input.head, size: "xs", weight: "bold", color: input.tone === "ok" ? OK : input.tone === "alert" ? ALERT : MUTED },
  ];
  if (heading.maker) {
    body.push({ type: "text", text: heading.maker, size: "xs", color: MUTED, margin: "md" });
  }
  body.push({ type: "text", text: name.slice(0, 80), weight: "bold", wrap: true, margin: heading.maker ? "xs" : "md" });
  const priceRow: Record<string, unknown>[] = [
    { type: "text", text: price, size: "xl", weight: "bold", flex: 0 },
    { type: "text", text: "万円", size: "sm", gravity: "bottom", flex: 0, margin: "sm" },
  ];
  if (input.priceNote) {
    priceRow.push({ type: "text", text: input.priceNote, size: "xs", color: ALERT, gravity: "bottom", margin: "md", flex: 0 });
  }
  body.push({ type: "box", layout: "baseline", contents: priceRow, margin: "md" });
  if (input.meta) body.push({ type: "text", text: input.meta.slice(0, 80), size: "xs", color: MUTED, margin: "sm", wrap: true });
  const buttons = [
    button(input.primaryLabel, primary),
    ...(input.secondaryLabel && secondary ? [button(input.secondaryLabel, secondary)] : []),
  ];
  const bubble: Record<string, unknown> = {
    type: "bubble",
    header: stripe(),
    body: { type: "box", layout: "vertical", spacing: "none", contents: body },
    footer: { type: "box", layout: "vertical", spacing: "sm", contents: buttons },
  };
  if (photoUrl.startsWith("https://")) {
    bubble.hero = {
      type: "image",
      url: photoUrl,
      size: "full",
      aspectRatio: "2:1",
      aspectMode: "cover",
      action: { type: "uri", uri: primary },
    };
  }
  return {
    type: "flex",
    altText: `${input.head}：${name} ${price}万円`.slice(0, 300),
    contents: bubble,
  };
}

export function textCard(altText: string, body: string, button?: { label: string; uri?: string; data?: string }): LineMessage {
  const contents: Record<string, unknown>[] = [{ type: "text", text: body, wrap: true, size: "sm" }];
  const bubble: Record<string, unknown> = {
    type: "bubble",
    header: stripe(),
    body: { type: "box", layout: "vertical", contents },
  };
  if (button?.uri || button?.data) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        filled(
          button.label,
          button.uri
            ? { type: "uri", label: button.label.slice(0, 40), uri: button.uri }
            : { type: "postback", label: button.label.slice(0, 40), data: button.data, displayText: button.label.slice(0, 40) },
        ),
      ],
    };
  }
  return { type: "flex", altText: altText.slice(0, 300), contents: bubble };
}

export function listingMeta(record: Pick<ArchiveRecord, "highlights" | "sections" | "color">): string {
  const year = factValue(record, "年式") || factValue(record, "年式(初度登録年)");
  const distance = factValue(record, "走行距離");
  const place = record.color || factValue(record, "地域");
  return [year, distance, place].filter(Boolean).join(" ・ ");
}

export function manDisplay(totalPrice: string, priceYen: number | null): string {
  if (priceYen != null) {
    const man = priceYen / 10000;
    const rounded = Math.round(man * 10) / 10;
    if (Number.isInteger(rounded)) return new Intl.NumberFormat("ja-JP").format(rounded);
    return rounded.toFixed(1);
  }
  const match = totalPrice.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : "—";
}

export function signedMan(deltaYen: number): string {
  const man = Math.round((Math.abs(deltaYen) / 10000) * 10) / 10;
  const text = Number.isInteger(man) ? String(man) : man.toFixed(1);
  return `${deltaYen < 0 ? "−" : "+"}${text}万`;
}

export function tokyoStamp(iso: string, now = new Date()): { monthDay: string; clock: string; today: boolean } {
  const stamp = tokyo(iso);
  const current = tokyo(now.toISOString());
  return {
    monthDay: `${stamp.month}/${stamp.day}`,
    clock: `${stamp.hour}:${stamp.minute}`,
    today: stamp.month === current.month && stamp.day === current.day && stamp.year === current.year,
  };
}

function tokyo(iso: string): { year: string; month: number; day: number; hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const read = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return { year: read("year"), month: Number(read("month")), day: Number(read("day")), hour: read("hour"), minute: read("minute") };
}

function button(label: string, uri: string): Record<string, unknown> {
  return filled(label, { type: "uri", label: label.slice(0, 40), uri });
}

function filled(label: string, action: Record<string, unknown>): Record<string, unknown> {
  return {
    type: "box",
    layout: "vertical",
    backgroundColor: BUTTON,
    cornerRadius: "md",
    paddingAll: "12px",
    margin: "sm",
    action,
    contents: [{ type: "text", text: label.slice(0, 40), color: "#FFFFFF", weight: "bold", align: "center" }],
  };
}

function absolute(origin: string, path: string): string {
  if (path.startsWith("https://") || path.startsWith("http://")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
