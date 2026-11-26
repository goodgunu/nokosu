// LINEフローの「URLを送る→保存→あとで見返す」のステップ表示。
// 番号の丸は、親の <Reveal> が見えたとき（data-revealed）か done のときに、順番（--motion-i）に塗られる。
// 時間とカーブは共通モーション（lib/motion）の CSS 変数だけを使う。
import { Check } from "lucide-react";

const ORANGE = "#E4682C";

// 丸の塗り：scale 0 → 1（transform だけ）。i 番目は「ふつう」の時間 × i だけ遅れて塗られる
const FILL =
  "absolute inset-0 -z-10 rounded-full scale-0 transition-transform duration-[var(--motion-dur-base)] ease-[var(--motion-ease-out)] [transition-delay:calc(var(--motion-dur-short)+var(--motion-i,0)*var(--motion-dur-base))] [[data-revealed]_&]:scale-100 [html:not(.motion-js)_&]:scale-100";
const NUM_ON =
  "absolute inset-0 grid place-items-center text-white opacity-0 transition-opacity duration-[var(--motion-dur-short)] ease-[var(--motion-ease-out)] [transition-delay:calc(var(--motion-dur-short)+var(--motion-i,0)*var(--motion-dur-base))] [[data-revealed]_&]:opacity-100 [html:not(.motion-js)_&]:opacity-100";

export function StepDot({ n, size = 24, done, check = false }: { n: number; size?: number; done?: boolean; check?: boolean }) {
  return (
    <span
      className="relative isolate grid shrink-0 place-items-center rounded-full border-2 text-xs font-bold"
      style={{ width: size, height: size, borderColor: ORANGE, color: ORANGE }}
      data-step-dot={done ? "done" : "todo"}
      aria-hidden
    >
      <span className={`${FILL} ${done ? "scale-100" : ""}`} style={{ background: ORANGE }} />
      {n}
      <span className={`${NUM_ON} ${done ? "opacity-100" : ""}`}>{check ? <Check className="size-3.5" strokeWidth={3} /> : n}</span>
    </span>
  );
}

export const LINE_STEPS = ["URLを送る", "保存", "あとで見返す"] as const;

/**
 * LINEから開いた画面用。current までのステップが塗られ、今のステップは塗られた時にポンと弾む。
 * current = 0: URLを受け取った, 1: 保存中, 2: 保存できて見返す画面へ
 */
export function LineSteps({ current, stopped = false }: { current: number; stopped?: boolean }) {
  return (
    <ol className="flex items-start justify-between gap-1" aria-label="LINEから保存する流れ" data-line-steps={current}>
      {LINE_STEPS.map((label, i) => {
        const last = i === LINE_STEPS.length - 1;
        const done = i < current || (i === current && !stopped && last);
        const active = i === current && !stopped;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center" aria-current={active ? "step" : undefined}>
            {/* key を変えると、そのステップに来た瞬間に1回ポンと弾む */}
            <span key={active || done ? "on" : "off"} className={active || done ? "motion-pop" : undefined}>
              <StepDot n={i + 1} size={32} done={done || active} check={done} />
            </span>
            <span className={`text-xs ${active || done ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
