"use client";

import { useEffect, useRef, useState, type ComponentPropsWithRef, type ElementType, type RefObject } from "react";
import { useMergedRef } from "./merge-refs";
import { prefersReducedMotion } from "./reduced-motion";
import { MOTION_DURATION } from "./tokens";

/**
 * 出る・消える動きの種類（消える時の向き。出る時はその逆から戻ってきます）
 * - fade：その場で透明に
 * - fade-up：上へ少し動きながら消える（出る時は上から）
 * - fade-down：下へ少し動きながら消える（出る時は下から）
 * - scale-out：少し小さくなりながら消える（出る時は少し小さい所から）
 */
export type PresenceVariant = "fade" | "fade-up" | "fade-down" | "scale-out";

export type PresenceState = "enter" | "exit" | undefined;

export type UsePresenceOptions = {
  /** 消える動きの最長待ち時間（ミリ秒）。これを過ぎたら必ず外します（標準 400） */
  timeout?: number;
  /** 最初に show=true で描いた時も「出る」動きをするか（標準 false） */
  appear?: boolean;
};

/**
 * 消える時の動きが終わるまで、要素を残しておくフック。
 *
 * const p = usePresence<HTMLDivElement>(open);
 * {p.mounted && <div ref={p.ref} data-presence="fade-down" data-presence-state={p.state}>…</div>}
 *
 * 「視差効果を減らす」の人には、すぐ外します。
 */
export function usePresence<T extends HTMLElement = HTMLElement>(show: boolean, options: UsePresenceOptions = {}) {
  const { timeout = MOTION_DURATION.long, appear = false } = options;
  const ref = useRef<T | null>(null);
  const [mounted, setMounted] = useState(show);
  const [state, setState] = useState<PresenceState>(show && appear ? "enter" : undefined);
  const [prevShow, setPrevShow] = useState(show);

  // show が変わったら、描く時点で状態を合わせる（React の推奨パターン）
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) {
      setMounted(true);
      setState("enter");
    } else if (prefersReducedMotion()) {
      setMounted(false);
      setState(undefined);
    } else {
      setState("exit");
    }
  }

  useEffect(() => {
    if (state !== "exit") return;
    const el = ref.current;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setMounted(false);
      setState(undefined);
    };
    const onEnd = (e: AnimationEvent | TransitionEvent) => {
      if (e.target === el) finish();
    };
    el?.addEventListener("animationend", onEnd);
    el?.addEventListener("transitionend", onEnd);
    const timer = window.setTimeout(finish, el ? timeout + 50 : 0);
    return () => {
      done = true;
      window.clearTimeout(timer);
      el?.removeEventListener("animationend", onEnd);
      el?.removeEventListener("transitionend", onEnd);
    };
  }, [state, timeout]);

  return { mounted, state, ref: ref as RefObject<T | null>, isExiting: state === "exit" };
}

type PresenceOwnProps<E extends ElementType> = {
  /** 表示するか。false にすると、消える動きのあとで外れます */
  show: boolean;
  /** 動きの種類（標準 "fade"） */
  variant?: PresenceVariant;
  /** どのタグ・部品で描くか（標準 "div"） */
  as?: E;
  /** 最初に show=true で描いた時も「出る」動きをするか（標準 false） */
  appear?: boolean;
  /** 消える動きの最長待ち時間（ミリ秒、標準 400） */
  timeout?: number;
};

export type PresenceProps<E extends ElementType = "div"> = PresenceOwnProps<E> &
  Omit<ComponentPropsWithRef<E>, keyof PresenceOwnProps<E>>;

/**
 * 出る時・消える時に動く箱。消える動きが終わってから DOM から外れます。
 * <Presence show={open} variant="fade-down" className="…">…</Presence>
 * onClick・data-*・aria-*・ref などはそのまま中の要素に渡ります。
 */
export function Presence<E extends ElementType = "div">(props: PresenceProps<E>) {
  const { show, variant = "fade", as, appear, timeout, ref, ...rest } = props as PresenceProps<"div"> & {
    as?: ElementType;
  };
  const Tag = (as ?? "div") as ElementType;
  const p = usePresence<HTMLElement>(show, { appear, timeout });
  const mergedRef = useMergedRef<HTMLElement>(p.ref, ref as never);
  if (!p.mounted) return null;
  return (
    <Tag
      {...rest}
      ref={mergedRef}
      data-presence={variant}
      data-presence-state={p.state}
      aria-hidden={p.isExiting ? true : (rest as { "aria-hidden"?: boolean })["aria-hidden"]}
    />
  );
}
