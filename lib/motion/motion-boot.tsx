// サーバーコンポーネント（"use client" なし）。インラインのスクリプトを HTML にそのまま出すため。
import { MotionReady } from "./motion-ready";

/** html に motion-js を付ける、いちばん最初に動く小さなスクリプト */
const BOOT_SCRIPT = "document.documentElement.classList.add('motion-js')";

/**
 * ルートレイアウトの <body> の先頭に 1 回だけ置きます。
 * - 読み込み直後：html に motion-js を付ける（これで初めて「出てくる前の状態」に隠れる）
 * - 画面が動き出した後（hydration 後）：html に motion-ready を付ける
 * JS が動かない時は何も隠れません。JS の起動に 1 秒以上かかった時も、隠したものは自動で出ます。
 */
export function MotionBoot() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      <MotionReady />
    </>
  );
}
