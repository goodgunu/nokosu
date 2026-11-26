"use client";

import { useCallback, useRef } from "react";
import { MOTION_DURATION, MOTION_EASING, MOTION_SCALE } from "./tokens";
import { prefersReducedMotion } from "./reduced-motion";

/**
 * ★・♡ を押した時の「ポン」。押すたびに確実に動きます。
 * React が className を書き換えても止まらないように、Web Animations API で動かします。
 *
 * const [popRef, pop] = usePop<HTMLButtonElement>();
 * <button ref={popRef} onClick={() => { toggleFavorite(); pop(); }}>♡</button>
 */
export function usePop<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const pop = useCallback(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== "function" || prefersReducedMotion()) return;
    el.animate(
      [
        { transform: "scale(1)", easing: MOTION_EASING.out },
        { transform: `scale(${MOTION_SCALE.pop})`, easing: MOTION_EASING.spring, offset: 0.35 },
        { transform: "scale(1)" },
      ],
      { duration: MOTION_DURATION.long },
    );
  }, []);
  return [ref, pop] as const;
}
