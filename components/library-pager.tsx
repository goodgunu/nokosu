"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageButtons } from "@/lib/library-page";

const ORANGE = "#E4682C";
const BASE = "inline-flex h-11 min-w-11 items-center justify-center rounded-full text-sm font-bold tabular-nums";

// 一覧の下のページ送り（前へ・番号・次へ）。タップしやすいよう44px
export function LibraryPager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const buttons = pageButtons(page, totalPages);
  return (
    <nav className="mt-5 flex flex-col items-center gap-2" aria-label="ページ送り" data-library="pager">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:justify-center">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={`${BASE} gap-0.5 border bg-card pr-4 pl-2.5 disabled:opacity-40`}
          style={{ borderColor: page <= 1 ? "#E5E5E5" : ORANGE, color: page <= 1 ? undefined : "#9C3D12" }}
          data-control="page-prev"
        >
          <ChevronLeft className="size-4" aria-hidden />
          前へ
        </button>
        <ol className="order-first flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto">
          {buttons.map((item, index) =>
            item === "…" ? (
              <li key={`gap-${index}`} className="text-muted-foreground w-5 text-center text-sm" aria-hidden>
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onChange(item)}
                  aria-current={item === page ? "page" : undefined}
                  aria-label={`${item}ページ目`}
                  className={`${BASE} px-2 ${item === page ? "text-white shadow-sm" : "border border-border bg-card"}`}
                  style={item === page ? { background: ORANGE } : undefined}
                  data-page={item}
                >
                  {item}
                </button>
              </li>
            ),
          )}
        </ol>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={`${BASE} gap-0.5 pr-2.5 pl-4 text-white disabled:opacity-40`}
          style={{ background: ORANGE }}
          data-control="page-next"
        >
          次へ
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">
        {page} / {totalPages}ページ
      </p>
    </nav>
  );
}
