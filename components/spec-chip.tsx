import type { CardInfo } from "@/lib/card-info";

export function SpecChip({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "warn" | "calm" }) {
  const toneClass =
    tone === "warn"
      ? "border-red-300 bg-red-50 text-red-700 font-bold"
      : tone === "calm"
        ? "border-border bg-muted text-muted-foreground font-medium"
        : "border-border bg-card text-foreground font-bold";
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs ${toneClass}`}>
      <span className="text-[10px] font-medium opacity-70">{label}</span>
      <span className="truncate text-sm">{value || "—"}</span>
    </span>
  );
}

// 年式・走行・色・修復歴の4チップ(一覧と詳細で共通)
export function SpecChips({ info }: { info: CardInfo }) {
  return (
    <div className="flex flex-wrap gap-1.5" data-card="chips">
      <SpecChip label="年式" value={info.year} />
      <SpecChip label="走行" value={info.distance} />
      <SpecChip label="色" value={info.color} />
      <SpecChip
        label="修復歴"
        value={info.repair === "has" ? "あり" : info.repair === "none" ? "なし" : info.repairText}
        tone={info.repair === "has" ? "warn" : info.repair === "none" ? "calm" : "plain"}
      />
    </div>
  );
}

export function priceNumber(display: string): string {
  if (!display) return "価格未記載";
  return display.replace(/\s*万円.*$/u, "") || display;
}

export function showsMan(display: string): boolean {
  return display.includes("万円");
}
