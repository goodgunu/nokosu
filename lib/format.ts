import type { ArchiveRecord, Fact } from "@/lib/types";

export function yenFromManDisplay(text: string): number | null {
  const normalized = text.replace(/,/g, "");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*万円/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10000);
}

export function formatYen(yen: number | null): string {
  if (yen == null) return "価格未記載";
  return `${new Intl.NumberFormat("ja-JP").format(yen)}円`;
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function displayName(record: Pick<ArchiveRecord, "maker" | "model" | "title">): string {
  return vehicleHeading({ ...record, color: "", highlights: [], sections: [] }).heading;
}

export function vehicleHeading(record: Pick<ArchiveRecord, "maker" | "model" | "title" | "color" | "highlights" | "sections">): {
  maker: string;
  heading: string;
  subline: string;
} {
  let rest = record.title.replace(/\s+/g, " ").trim();
  rest = rest.replace(/（[^）]*）\s*$/u, "").trim();
  rest = stripLeading(rest, record.maker);
  if (record.model && record.model !== record.maker) rest = stripLeading(rest, record.model);
  const model = record.model && record.model !== record.maker ? record.model : "";
  const heading = [model, rest].filter(Boolean).join(" ") || record.title || "名称不明の車両";
  const year = factValue(record, "年式") || factValue(record, "年式(初度登録年)");
  const distance = factValue(record, "走行距離");
  const subline = [year, distance, record.color].filter((item) => item && !isBlankValue(item)).join(" ・ ");
  return { maker: record.maker, heading, subline };
}

export function isBlankValue(value: string): boolean {
  const compact = value.replace(/\s+/g, "");
  return !compact || /^[-－−—~〜.．・]+$/u.test(compact);
}

export function ledgerFacts(record: Pick<ArchiveRecord, "highlights" | "sections">): { label: string; value: string }[] {
  const wanted: { label: string; keys: string[] }[] = [
    { label: "修復歴", keys: ["修復歴"] },
    { label: "保証", keys: ["保証", "保証期間"] },
    { label: "車検", keys: ["車検", "車検有無"] },
    { label: "法定整備", keys: ["法定整備"] },
    { label: "ミッション", keys: ["ミッション", "ミッション詳細"] },
    { label: "地域", keys: ["地域"] },
  ];
  return wanted.flatMap((item) => {
    const value = item.keys.map((key) => factValue(record, key)).find((found) => found && !isBlankValue(found));
    return value ? [{ label: item.label, value }] : [];
  });
}

export function formatMonthDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatCheck(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const time = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (date.toDateString() === now.toDateString()) return `今日 ${time}`;
  return `${formatDay(iso)} ${time}`;
}

function stripLeading(title: string, prefix: string): string {
  const token = prefix.replace(/\s+/g, " ").trim();
  if (!token) return title;
  let rest = title;
  while (rest === token || rest.startsWith(`${token} `) || rest.startsWith(token)) {
    if (!rest.startsWith(token)) break;
    const next = rest.slice(token.length).trim();
    if (next === rest) break;
    rest = next;
    if (!rest.startsWith(token)) break;
  }
  return rest;
}

export function gradeLine(record: Pick<ArchiveRecord, "maker" | "model" | "title">): string {
  let title = record.title.replace(/\s+/g, " ").trim();
  if (record.maker && title.startsWith(record.maker)) {
    title = title.slice(record.maker.length).trim();
  }
  if (record.model && title.startsWith(record.model)) {
    title = title.slice(record.model.length).trim();
  }
  return title;
}

export function factValue(
  record: Pick<ArchiveRecord, "highlights" | "sections">,
  label: string,
): string {
  const highlight = record.highlights.find((item) => item.label === label);
  if (highlight?.value) return highlight.value;
  for (const section of record.sections) {
    const row = section.rows.find((item) => item.label === label);
    if (row?.values.length) return row.values.join(" / ");
  }
  return "";
}

export function yearNumber(record: Pick<ArchiveRecord, "highlights" | "sections">): number | null {
  const text = factValue(record, "年式") || factValue(record, "年式(初度登録年)");
  const match = text.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

export function highlightChips(highlights: Fact[]): Fact[] {
  const order = ["年式", "走行距離", "修復歴", "車検有無", "地域", "保証"];
  return order.flatMap((label) => {
    const found = highlights.find((item) => item.label === label);
    return found ? [found] : [];
  });
}
