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
  const head = [record.maker, record.model].filter(Boolean).join(" ");
  return head || record.title || "名称不明の車両";
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
