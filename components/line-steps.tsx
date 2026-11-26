"use client";

// LINEフローの「URLを送る→保存→あとで見返す」の進み具合。
// 番号の丸は共通部品の .motion-step-dot（色は --motion-step-color = オレンジ）。
import { Check } from "lucide-react";
import { useInView } from "@/lib/motion";

export const LINE_STEPS = ["URLを送る", "保存", "あとで見返す"] as const;

/**
 * LINEから開いた画面用。current までのステップが塗られ、今のステップは塗られた時にポンと弾む。
 * current = 0: URLを受け取った, 1: 保存中, 2: 保存できて見返す画面へ
 */
export function LineSteps({ current, stopped = false }: { current: number; stopped?: boolean }) {
  const [ref, inView] = useInView<HTMLOListElement>();
  return (
    <ol
      ref={ref}
      className="flex items-start justify-between gap-1"
      aria-label="LINEから保存する流れ"
      data-line-steps={current}
      data-steps=""
      data-revealed={inView ? "" : undefined}
      style={{ ["--motion-step-color" as string]: "var(--orange)" }}
    >
      {LINE_STEPS.map((label, i) => {
        const last = i === LINE_STEPS.length - 1;
        const done = i < current || (i === current && !stopped && last);
        const active = i === current && !stopped;
        const filled = done || active;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center" aria-current={active ? "step" : undefined}>
            {/* key を変えると、そのステップに来た瞬間に1回ポンと弾む */}
            <span
              key={filled ? "on" : "off"}
              className={`motion-step-dot size-8 border-2 border-[var(--motion-step-color)] text-xs font-bold ${filled ? "motion-pop text-white" : "text-[var(--motion-step-color)]"}`}
              style={{ ["--motion-i" as string]: i }}
              data-pending={filled ? undefined : ""}
              aria-hidden
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`text-xs ${filled ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
