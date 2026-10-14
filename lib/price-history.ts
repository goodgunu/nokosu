import type { ArchiveRecord, PricePoint } from "@/lib/types";

const HISTORY_LIMIT = 30;
const DAY_MS = 20 * 60 * 60 * 1000;

export function priceHistoryAfter(
  previous: Pick<ArchiveRecord, "priceHistory" | "priceYen" | "totalPrice" | "basePrice" | "savedAt"> | undefined,
  next: PricePoint,
): PricePoint[] {
  const base = previous?.priceHistory?.length
    ? previous.priceHistory.map(cleanPoint).filter((point): point is PricePoint => Boolean(point))
    : previous
      ? [
          {
            at: previous.savedAt,
            priceYen: previous.priceYen,
            totalPrice: previous.totalPrice || previous.basePrice,
          },
        ]
      : [];
  const last = base[base.length - 1];
  const history = last && samePrice(last, next) ? base : [...base, next];
  return history.slice(-HISTORY_LIMIT);
}

export function checkDue(record: Pick<ArchiveRecord, "lastCheckedAt" | "checkAttemptAt" | "savedAt">, now: number): boolean {
  const success = Date.parse(record.lastCheckedAt || record.savedAt || "");
  const attempt = Date.parse(record.checkAttemptAt || "");
  const latest = Math.max(Number.isFinite(success) ? success : 0, Number.isFinite(attempt) ? attempt : 0);
  return now - latest >= DAY_MS;
}

export function priceChange(record: Pick<ArchiveRecord, "priceHistory">): {
  kind: "down" | "up" | "same";
  label: string;
  previous: string;
} {
  const points = (record.priceHistory ?? []).filter((point) => point.totalPrice || point.priceYen != null);
  if (points.length < 2) return { kind: "same", label: "価格変動なし", previous: "" };
  const latest = points[points.length - 1];
  const before = points[points.length - 2];
  if (latest.priceYen != null && before.priceYen != null && latest.priceYen !== before.priceYen) {
    const delta = latest.priceYen - before.priceYen;
    const kind = delta < 0 ? "down" : "up";
    return {
      kind,
      label: `${manText(Math.abs(delta))}${kind === "down" ? "値下げ" : "値上げ"}`,
      previous: before.totalPrice,
    };
  }
  if (latest.totalPrice && before.totalPrice && latest.totalPrice !== before.totalPrice) {
    return { kind: "down", label: "価格が変わりました", previous: before.totalPrice };
  }
  return { kind: "same", label: "価格変動なし", previous: before.totalPrice };
}

export function sanitizePriceHistory(input: unknown): PricePoint[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const points = input.slice(-HISTORY_LIMIT).map(cleanPoint).filter((point): point is PricePoint => Boolean(point));
  return points.length ? points : undefined;
}

function cleanPoint(input: unknown): PricePoint | null {
  if (!input || typeof input !== "object") return null;
  const point = input as Partial<PricePoint>;
  if (typeof point.at !== "string" || Number.isNaN(Date.parse(point.at))) return null;
  const priceYen = typeof point.priceYen === "number" && Number.isFinite(point.priceYen) ? Math.round(point.priceYen) : null;
  const totalPrice = typeof point.totalPrice === "string" ? point.totalPrice.slice(0, 40) : "";
  if (priceYen == null && !totalPrice) return null;
  return { at: point.at, priceYen, totalPrice };
}

function samePrice(left: PricePoint, right: PricePoint): boolean {
  if (left.priceYen != null && right.priceYen != null) return left.priceYen === right.priceYen;
  if (!left.totalPrice && !right.totalPrice) return true;
  return left.totalPrice === right.totalPrice && left.totalPrice !== "";
}

function manText(yen: number): string {
  const man = Math.round((yen / 10000) * 10) / 10;
  const text = Number.isInteger(man) ? String(man) : man.toFixed(1);
  return `${text}万円`;
}
