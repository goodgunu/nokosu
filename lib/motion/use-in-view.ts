"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { MOTION_IN_VIEW } from "./tokens";

type Listener = (entry: IntersectionObserverEntry) => void;
type Shared = { observer: IntersectionObserver; listeners: Map<Element, Set<Listener>> };

/**
 * 同じ設定（threshold・rootMargin）ごとに IntersectionObserver を 1 つだけ作って共有します。
 * カードが 50 枚あっても監視役は 1 つなので軽いです。
 */
const observers = new Map<string, Shared>();

function getShared(threshold: number, rootMargin: string): Shared {
  const key = `${threshold}|${rootMargin}`;
  let shared = observers.get(key);
  if (!shared) {
    const listeners = new Map<Element, Set<Listener>>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const set = listeners.get(entry.target);
          if (set) for (const fn of set) fn(entry);
        }
      },
      // 0 も入れておくと、画面より背の高い要素も「入った」瞬間に分かる
      { threshold: threshold > 0 ? [0, threshold] : [0], rootMargin },
    );
    shared = { observer, listeners };
    observers.set(key, shared);
  }
  return shared;
}

/** 共有の監視役に要素を登録します。戻り値の関数で登録を外します。 */
export function observeInView(
  el: Element,
  listener: (visible: boolean, entry: IntersectionObserverEntry) => void,
  options: { threshold?: number; rootMargin?: string } = {},
): () => void {
  const threshold = options.threshold ?? MOTION_IN_VIEW.threshold;
  const rootMargin = options.rootMargin ?? MOTION_IN_VIEW.rootMargin;
  const shared = getShared(threshold, rootMargin);
  const fn: Listener = (entry) => {
    let visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
    if (!visible && entry.isIntersecting) {
      // 画面より背が高くて 15% に届かない要素は、入った時点で「見えた」にする
      const rootH = entry.rootBounds?.height ?? window.innerHeight;
      if (entry.boundingClientRect.height * threshold >= rootH * 0.9) visible = true;
    }
    listener(visible, entry);
  };
  let set = shared.listeners.get(el);
  if (!set) {
    set = new Set();
    shared.listeners.set(el, set);
    shared.observer.observe(el);
  }
  set.add(fn);
  return () => {
    const s = shared.listeners.get(el);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) {
      shared.listeners.delete(el);
      shared.observer.unobserve(el);
    }
  };
}

export type UseInViewOptions = {
  /** 一度見えたら、その後は見えたままにする（標準 true） */
  once?: boolean;
  /** 何割見えたら「見えた」にするか（標準 0.15） */
  threshold?: number;
  /** 判定する範囲の広げ方（標準 "0px 0px 10% 0px" = 少し手前から） */
  rootMargin?: string;
  /** false にすると監視しません */
  enabled?: boolean;
};

/**
 * 要素が画面に入ったかを返します。
 * const [ref, inView] = useInView<HTMLDivElement>();
 * IntersectionObserver がないブラウザでは、すぐ true になります。
 */
export function useInView<T extends Element = HTMLElement>(
  options: UseInViewOptions = {},
): [RefObject<T | null>, boolean] {
  const { once = true, threshold, rootMargin, enabled = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 古いブラウザ向けの保険
      setInView(true);
      return;
    }
    let stop: (() => void) | null = null;
    stop = observeInView(
      el,
      (visible) => {
        if (visible) {
          setInView(true);
          if (once && stop) {
            stop();
            stop = null;
          }
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    return () => {
      if (stop) stop();
    };
  }, [once, threshold, rootMargin, enabled]);

  return [ref, inView];
}

/**
 * useInView の「出てくる動き」用。返ってきた props を要素に広げるだけで、
 * 画面に入った時に motion.css の動きが付きます。
 *
 * const reveal = useReveal<HTMLDivElement>("fade-up");
 * <div {...reveal}>…</div>
 */
export function useReveal<T extends Element = HTMLElement>(
  variant: RevealVariant = "fade-up",
  options: UseInViewOptions = {},
): { ref: RefObject<T | null>; "data-reveal": RevealVariant; "data-revealed": "" | undefined } {
  const [ref, inView] = useInView<T>(options);
  return { ref, "data-reveal": variant, "data-revealed": inView ? "" : undefined };
}

export type RevealVariant = "fade" | "fade-up" | "slide-left" | "slide-right" | "scale-in";
