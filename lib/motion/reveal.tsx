"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { motionDelayStyle as delayStyle } from "./shared";
import { useInView, type RevealVariant } from "./use-in-view";

type CommonProps = {
  /** 動きの種類（標準 "fade-up"） */
  variant?: RevealVariant;
  /** 出るまでの追加の遅れ（ミリ秒） */
  delay?: number;
  /** どのタグで描くか（標準 "div"。"section" "li" "ul" など） */
  as?: ElementType;
  /** 一度出たら出たまま（標準 true）。false だと画面から外れるたびに隠れて、また出ます */
  once?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  children?: ReactNode;
};

type RevealProps = CommonProps & {
  /** 時間差表示の順番（0, 1, 2, ...）。自分で並べる時に使います */
  index?: number;
};

/**
 * 画面に入った時にふわっと出す箱。
 * <Reveal variant="fade-up">…</Reveal>
 * JS が動かない時や「視差効果を減らす」の人には、最初から普通に見えています。
 */
export function Reveal({ variant = "fade-up", delay, index, as, once = true, className, style, id, children }: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const [ref, inView] = useInView<HTMLElement>({ once });
  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      style={delayStyle(style, delay, index)}
      data-reveal={variant}
      data-revealed={inView ? "" : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * 直接の子を、上から順に少しずつずらして出す入れ物。
 * <Stagger as="ul" className="grid gap-3">
 *   {items.map((x) => <li key={x.id}>…</li>)}
 * </Stagger>
 * ずらすのは最初の 10 件まで（それ以降は 10 件目と同じタイミング）。
 */
export function Stagger({ variant = "fade-up", delay, as, once = true, className, style, id, children }: CommonProps) {
  const Tag = (as ?? "div") as ElementType;
  // 背の高いリストでも動くように、少しでも入ったら開始
  const [ref, inView] = useInView<HTMLElement>({ once, threshold: 0 });
  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      style={delayStyle(style, delay)}
      data-stagger={variant}
      data-revealed={inView ? "" : undefined}
    >
      {children}
    </Tag>
  );
}
