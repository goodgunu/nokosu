"use client";

import type { ComponentPropsWithRef, CSSProperties, ElementType } from "react";
import { useMergedRef } from "./merge-refs";
import { motionDelayStyle } from "./shared";
import { useInView, type RevealVariant } from "./use-in-view";

type RevealOwnProps<E extends ElementType> = {
  /** 動きの種類（標準 "fade-up"） */
  variant?: RevealVariant;
  /** 出るまでの追加の遅れ（ミリ秒） */
  delay?: number;
  /** 時間差の間隔（ミリ秒）。中の子に引きつがれます（吹き出しを 0.5 秒ずつ出す時など） */
  step?: number;
  /** どのタグ・部品で描くか（標準 "div"。"section" "li" "ul" や Link など） */
  as?: E;
  /** 一度出たら出たまま（標準 true）。false だと画面から外れるたびに隠れて、また出ます */
  once?: boolean;
  /**
   * 画面に入るのを待たず、開いた瞬間から動き出します（最初の HTML から data-revealed が付きます）。
   * when="mount" と同じです。ヒーローなど、画面の一番上に使うと表示が遅れません。
   */
  immediate?: boolean;
  /** "mount" で開いた瞬間から動く。"in-view"（標準）は画面に入ってから */
  when?: "in-view" | "mount";
};

/**
 * as に渡したタグの props（onClick・data-*・aria-*・id・ref など）をそのまま受け取れます。
 * style は時間差用の CSS 変数とまとめて渡します。
 */
export type RevealProps<E extends ElementType = "div"> = RevealOwnProps<E> & {
  /** 時間差表示の順番（0, 1, 2, ...）。自分で並べる時に使います */
  index?: number;
  /** true なら動きを付けず、最初から普通に見えます（一覧の先頭カードなど、表示の速さを落とさない） */
  skip?: boolean;
} & Omit<ComponentPropsWithRef<E>, keyof RevealOwnProps<E> | "index" | "skip">;

export type StaggerProps<E extends ElementType = "div"> = RevealOwnProps<E> & {
  /**
   * 先頭から何件まで動きを外すか（標準 0）。
   * 一覧の 1 枚目だけすぐ出して表示を速くするときは skip={1}（skipFirst でも同じ）。
   */
  skip?: number;
  /** skip={1} と同じ */
  skipFirst?: boolean;
} & Omit<ComponentPropsWithRef<E>, keyof RevealOwnProps<E>>;

function withStep(style: CSSProperties | undefined, step?: number, skipCount?: number): CSSProperties | undefined {
  if (step == null && !skipCount) return style;
  const s: Record<string, string | number> = { ...(style as Record<string, string | number> | undefined) };
  if (step != null) s["--motion-stagger-step"] = `${step}ms`;
  if (skipCount) s["--motion-skip"] = skipCount;
  return s as CSSProperties;
}

function isImmediate(immediate?: boolean, when?: "in-view" | "mount"): boolean {
  return immediate === true || when === "mount";
}

/**
 * 画面に入った時にふわっと出す箱。
 * <Reveal variant="fade-up">…</Reveal>
 * <Reveal as="li" index={i} onClick={…} data-id={x.id} aria-label="…">…</Reveal>
 * JS が動かない時や「視差効果を減らす」の人には、最初から普通に見えています。
 */
export function Reveal<E extends ElementType = "div">(props: RevealProps<E>) {
  const { variant = "fade-up", delay, index, step, as, once = true, immediate, when, skip = false, style, ref, ...rest } =
    props as RevealProps<"div"> & { as?: ElementType };
  const Tag = (as ?? "div") as ElementType;
  const mount = skip || isImmediate(immediate, when);
  const [inner, inView] = useInView<HTMLElement>({ once, immediate: mount, enabled: !skip });
  const mergedRef = useMergedRef<HTMLElement>(inner, ref as never);
  return (
    <Tag
      {...rest}
      ref={mergedRef}
      style={withStep(motionDelayStyle(style, delay, index), step)}
      data-reveal={variant}
      data-revealed={skip || inView ? "" : undefined}
      data-skip={skip ? "" : undefined}
    />
  );
}

/**
 * 直接の子を、上から順に少しずつずらして出す入れ物。
 * <Stagger as="ul" className="grid gap-3">
 *   {items.map((x) => <li key={x.id}>…</li>)}
 * </Stagger>
 * ずらすのは最初の 10 件まで（それ以降は 10 件目と同じタイミング）。
 * 吹き出しのようにゆっくり順番に出したい時は step={500} のように間隔を広げます。
 */
export function Stagger<E extends ElementType = "div">(props: StaggerProps<E>) {
  const { variant = "fade-up", delay, step, as, once = true, immediate, when, skip, skipFirst, style, ref, ...rest } =
    props as StaggerProps<"div"> & { as?: ElementType };
  const Tag = (as ?? "div") as ElementType;
  const skipCount = Math.max(0, Math.min(10, Math.floor(skip ?? (skipFirst ? 1 : 0))));
  const mount = isImmediate(immediate, when);
  // 背の高いリストでも動くように、少しでも入ったら開始
  const [inner, inView] = useInView<HTMLElement>({ once, threshold: 0, immediate: mount });
  const mergedRef = useMergedRef<HTMLElement>(inner, ref as never);
  return (
    <Tag
      {...rest}
      ref={mergedRef}
      style={withStep(motionDelayStyle(style, delay), step, skipCount)}
      data-stagger={variant}
      data-revealed={inView ? "" : undefined}
      data-skip={skipCount ? String(skipCount) : undefined}
    />
  );
}
