/**
 * 動きの共通トークン（時間・イージング・距離）。
 * CSS 側の同じ値は motion.css の :root（--motion-*）にあります。
 * 値を変えるときは、このファイルと motion.css の両方をそろえてください。
 */

/** アニメーションの時間（ミリ秒） */
export const MOTION_DURATION = {
  /** タップの反応、小さな切り替え */
  short: 150,
  /** ふつうの表示・開閉・クロスフェード */
  base: 250,
  /** 画面を開いた時やスクロールでの登場、ポンと弾む動き */
  long: 400,
} as const;

/** イージング（動き方のカーブ） */
export const MOTION_EASING = {
  /** 標準：すっと出て、やわらかく止まる */
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** 行って戻る動き（開閉など） */
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** 強調：目立たせたい登場に */
  emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  /** ばねっぽく少し行き過ぎて戻る（★・♡ のポン） */
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** 時間差表示（stagger） */
export const MOTION_STAGGER = {
  /** 1つずつずらす間隔（ミリ秒） */
  step: 45,
  /** ずらすのは最初の何件まで（それ以降は同じタイミング） */
  max: 10,
} as const;

/** フェードアップ・スライドインで動く距離（px） */
export const MOTION_DISTANCE = 14;

/** 拡大縮小の量 */
export const MOTION_SCALE = {
  /** 押した時に沈む大きさ */
  press: 0.98,
  /** scale-in の始まりの大きさ */
  from: 0.96,
  /** ポンと弾む時の一番大きいところ */
  pop: 1.28,
} as const;

/** 画面に入ったかどうかの判定（IntersectionObserver） */
export const MOTION_IN_VIEW = {
  /** 要素の 15% が見えたら「見えた」 */
  threshold: 0.15,
  /** 画面の下端より少し手前（画面の高さの 10%）から判定を始める */
  rootMargin: "0px 0px 10% 0px",
} as const;

/** CSS 変数の名前（style={{ [MOTION_VARS.delay]: "120ms" }} のように使えます） */
export const MOTION_VARS = {
  durShort: "--motion-dur-short",
  durBase: "--motion-dur-base",
  durLong: "--motion-dur-long",
  easeOut: "--motion-ease-out",
  easeInOut: "--motion-ease-in-out",
  easeEmphasized: "--motion-ease-emphasized",
  easeSpring: "--motion-ease-spring",
  staggerStep: "--motion-stagger-step",
  distance: "--motion-distance",
  pressScale: "--motion-press-scale",
  /** 要素ごとの追加の遅れ（例 "120ms"） */
  delay: "--motion-delay",
  /** 時間差表示の順番（0, 1, 2, ...） */
  index: "--motion-i",
} as const;

/** i 番目の要素の遅れ（ミリ秒）。max 件目以降は同じ値になります。 */
export function staggerDelay(index: number, step: number = MOTION_STAGGER.step, max: number = MOTION_STAGGER.max): number {
  const i = Math.max(0, Math.min(Math.floor(index), max));
  return i * step;
}
