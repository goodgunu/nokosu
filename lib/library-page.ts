// 保存した車の一覧のページ分け（画面に依存しない計算だけ）
export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;
export const PAGE_SIZE_KEY = "nokosu-library-page-size";

export function parsePageSize(value: unknown): PageSize {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return (PAGE_SIZES as readonly number[]).includes(n) ? (n as PageSize) : DEFAULT_PAGE_SIZE;
}

export function parsePage(value: unknown): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function totalPages(count: number, size: number): number {
  return Math.max(1, Math.ceil(Math.max(0, count) / Math.max(1, size)));
}

export function clampPage(page: number, count: number, size: number): number {
  return Math.min(Math.max(1, Math.floor(page) || 1), totalPages(count, size));
}

export function paginate<T>(items: readonly T[], page: number, size: number) {
  const current = clampPage(page, items.length, size);
  const start = (current - 1) * size;
  const pageItems = items.slice(start, start + size);
  return {
    items: pageItems,
    page: current,
    totalPages: totalPages(items.length, size),
    from: items.length === 0 ? 0 : start + 1,
    to: start + pageItems.length,
    total: items.length,
  };
}

// ページ番号ボタンの並び。多いときは「…」で省く（最初・最後・今のページの前後1つは必ず出す）
export function pageButtons(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => keep.add(n));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => keep.add(n));
  const pages = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}
