"use client";

import { ViewTransition, type ReactNode } from "react";
import { prefersReducedMotion } from "./reduced-motion";
import { NAV_BACK, NAV_FORWARD } from "./shared";

/** このブラウザが View Transitions に対応しているか */
export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

/**
 * ページ移動以外の「画面の書き換え」をつなげて見せたい時用（document.startViewTransition の安全な包み）。
 * 対応していないブラウザや「視差効果を減らす」の人には、ただ update() を実行します。
 * ※ ページ移動には使わないでください（navigateWithTransition か <Link transitionTypes> を使う）。
 */
export function startViewTransition(update: () => void | Promise<void>): Promise<void> {
  if (!supportsViewTransitions() || prefersReducedMotion()) {
    return Promise.resolve().then(update);
  }
  const vt = document.startViewTransition(update);
  return vt.updateCallbackDone.catch(() => {});
}

type RouterLike = {
  push: (href: string, options?: { scroll?: boolean; transitionTypes?: string[] }) => void;
  replace: (href: string, options?: { scroll?: boolean; transitionTypes?: string[] }) => void;
};

/**
 * useRouter() を使ったページ移動を、つながりのある動きで行います。
 * Next.js 16.3 以降は設定なしで View Transitions が動きます（非対応ブラウザは普通に移動）。
 *
 * const router = useRouter();
 * navigateWithTransition(router, `/listings/${id}`);               // 進む
 * navigateWithTransition(router, "/", { direction: "back" });       // 戻る
 */
export function navigateWithTransition(
  router: RouterLike,
  href: string,
  options: { direction?: "forward" | "back" | "none"; replace?: boolean; scroll?: boolean; types?: string[] } = {},
): void {
  const { direction = "forward", replace = false, scroll, types = [] } = options;
  const transitionTypes = [...types];
  if (direction === "forward") transitionTypes.push(NAV_FORWARD);
  if (direction === "back") transitionTypes.push(NAV_BACK);
  const opts = { ...(scroll === undefined ? {} : { scroll }), transitionTypes };
  if (replace) router.replace(href, opts);
  else router.push(href, opts);
}

/**
 * 一覧のサムネと詳細の写真など、「同じもの」を画面をまたいでつなげる箱。
 * 両方の画面で同じ name を付けると、ページ移動の時に写真が移動・拡大して見えます。
 *
 * 一覧： <SharedElement name={vtName("photo", item.id)}><img … /></SharedElement>
 * 詳細： <SharedElement name={vtName("photo", item.id)}><img … /></SharedElement>
 *
 * 1 つの画面に同じ name が 2 つあると動かないので、id を必ず入れてください。
 */
export function SharedElement({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="motion-morph" default="none">
      {children}
    </ViewTransition>
  );
}
