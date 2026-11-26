// サーバーでもクライアントでも使える小さな部品（"use client" なし）。
import type { CSSProperties } from "react";
import { MOTION_STAGGER } from "./tokens";

/** <Link transitionTypes> や router.push の transitionTypes に使う名前 */
export const NAV_FORWARD = "nav-forward";
export const NAV_BACK = "nav-back";

/**
 * view-transition-name に使える名前を作ります（日本語や記号は _ に置きかえ）。
 * vtName("photo", listing.id) → "photo-abc123"
 */
export function vtName(...parts: Array<string | number>): string {
  const raw = parts
    .map((p) => String(p))
    .join("-")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return /^[a-zA-Z_]/.test(raw) ? raw : `v${raw}`;
}

/** 遅れと順番を CSS 変数（--motion-delay / --motion-i）にして style に足します */
export function motionDelayStyle(style: CSSProperties | undefined, delay?: number, index?: number): CSSProperties | undefined {
  if (delay == null && index == null) return style;
  const s: Record<string, string | number> = { ...(style as Record<string, string | number> | undefined) };
  if (delay != null) s["--motion-delay"] = `${delay}ms`;
  if (index != null) s["--motion-i"] = Math.max(0, Math.min(Math.floor(index), MOTION_STAGGER.max));
  return s as CSSProperties;
}

/**
 * 自分で並べる時の時間差用 style。<Reveal index={i}> と同じ効果です。
 * <div data-reveal="fade-up" style={staggerStyle(i)}>
 */
export function staggerStyle(index: number, extra?: CSSProperties): CSSProperties {
  return motionDelayStyle(extra, undefined, index) ?? {};
}
