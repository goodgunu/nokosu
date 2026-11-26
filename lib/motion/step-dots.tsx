"use client";

import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";
import { useMergedRef } from "./merge-refs";
import { useInView } from "./use-in-view";

type StepDotsOwnProps = {
  /** 丸の数 */
  count: number;
  /** いくつ目まで埋めるか（標準は全部）。進み具合の表示に使います */
  filled?: number;
  /** 丸の中に番号（1, 2, 3…）を出す。関数なら好きな中身にできます */
  labels?: boolean | ((index: number) => ReactNode);
  /** 埋める色（標準はサイトの色：おく＝黄、のこす＝オレンジ） */
  color?: string;
  /** 1 つずつ埋める間隔（ミリ秒、標準 45） */
  step?: number;
  /** 一つひとつの丸に付けるクラス（大きさ・枠線など） */
  dotClassName?: string;
  /** 一度埋まったら埋まったまま（標準 true） */
  once?: boolean;
};

export type StepDotsProps = StepDotsOwnProps & Omit<ComponentPropsWithRef<"ol">, keyof StepDotsOwnProps | "children">;

/**
 * 画面に入ったら、丸が 1 つずつ中から埋まっていく進み具合の表示。
 * <StepDots count={3} labels dotClassName="size-6 border border-[#E5C200] text-xs font-bold" />
 * 丸を自分で並べたい時は、.motion-step-dot クラスを使います（README 参照）。
 */
export function StepDots({ count, filled, labels, color, step, dotClassName, once = true, className, style, ref, ...rest }: StepDotsProps) {
  const [inner, inView] = useInView<HTMLOListElement>({ once });
  const mergedRef = useMergedRef<HTMLOListElement>(inner, ref as never);
  const vars: Record<string, string> = {};
  if (color) vars["--motion-step-color"] = color;
  if (step != null) vars["--motion-stagger-step"] = `${step}ms`;
  const fillCount = filled ?? count;
  return (
    <ol
      {...rest}
      ref={mergedRef}
      className={className ? `motion-step-dots ${className}` : "motion-step-dots"}
      style={{ ...style, ...vars } as CSSProperties}
      data-steps=""
      data-revealed={inView ? "" : undefined}
    >
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className={dotClassName ? `motion-step-dot ${dotClassName}` : "motion-step-dot"}
          style={{ ["--motion-i" as string]: Math.min(i, 10) } as CSSProperties}
          data-pending={i < fillCount ? undefined : ""}
          aria-current={i === fillCount - 1 && fillCount < count ? "step" : undefined}
        >
          {typeof labels === "function" ? labels(i) : labels ? i + 1 : null}
        </li>
      ))}
    </ol>
  );
}
