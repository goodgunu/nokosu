# 共通モーション（lib/motion）

のこす・おくの両方に**同じもの**が入っています。どちらかを直したら、もう片方にも同じ変更を入れてください。

- 新しいライブラリは使っていません（CSS と小さなフックだけ）
- 動かすのは `transform` と `opacity` だけ（スマホでも軽い）。フォームの開閉だけは高さも動きます
- 端末の「視差効果を減らす」がオンの人には、全部止まります（CSS と JS の両方で対応済み）
- JS が動かない時は何も隠れません。JS の起動が 3 秒以上かかった時も、隠したものは自動で出ます

すでに `app/layout.tsx` で次の 2 つを入れてあります。**追加でやることはありません。**

```tsx
import { MotionBoot } from "@/lib/motion/motion-boot";
import "@/lib/motion/motion.css";
// <html … suppressHydrationWarning>（html に motion-js クラスを足すため）
// <body> の先頭に <MotionBoot />
```

読み込みはぜんぶ `@/lib/motion` からできます。

```tsx
import { Reveal, Stagger, Collapse, useCollapse, usePop, SharedElement, vtName } from "@/lib/motion";
```

---

## 1. 共通の値（トークン）

| 名前 | TS | CSS 変数 | 値 |
|---|---|---|---|
| 短い | `MOTION_DURATION.short` | `--motion-dur-short` | 150ms（タップの反応） |
| ふつう | `MOTION_DURATION.base` | `--motion-dur-base` | 250ms（開閉・クロスフェード） |
| 長い | `MOTION_DURATION.long` | `--motion-dur-long` | 400ms（登場・ポン） |
| 標準カーブ | `MOTION_EASING.out` | `--motion-ease-out` | すっと出てやわらかく止まる |
| 行って戻る | `MOTION_EASING.inOut` | `--motion-ease-in-out` | 開閉など |
| 強調 | `MOTION_EASING.emphasized` | `--motion-ease-emphasized` | 画面のつながり |
| ばね | `MOTION_EASING.spring` | `--motion-ease-spring` | 少し行き過ぎて戻る（★・♡） |
| 時間差の間隔 | `MOTION_STAGGER.step` | `--motion-stagger-step` | 45ms（最初の 10 件まで） |
| 動く距離 | `MOTION_DISTANCE` | `--motion-distance` | 14px |
| 押した時の大きさ | `MOTION_SCALE.press` | `--motion-press-scale` | 0.98 |

その他の CSS 変数：`--motion-scale-from`（0.96）、`--motion-pop-scale`（1.28）、`--motion-lift-shadow`、
要素ごとの `--motion-delay`（追加の遅れ）・`--motion-i`（時間差の順番）。

自分で CSS を書く時も、数字ではなくこの変数を使ってください。そうすれば「視差効果を減らす」の時に自動で 0 になります。

```tsx
<div className="transition-opacity duration-[var(--motion-dur-base)] ease-[var(--motion-ease-out)]">…</div>
```

---

## 2. 画面に入ったらふわっと出す：`<Reveal>`

```tsx
<Reveal variant="fade-up">
  <h1>気になった車を、消える前に残す。</h1>
</Reveal>

<Reveal variant="fade-up" delay={120} as="section" className="mt-8">…</Reveal>
```

| props | 意味 |
|---|---|
| `variant` | `"fade"` / `"fade-up"`（標準・下から） / `"slide-left"`（左から） / `"slide-right"`（右から） / `"scale-in"`（少し小さい所から） |
| `delay` | 追加の遅れ（ミリ秒） |
| `index` | 時間差の順番（0, 1, 2…。10 で頭打ち） |
| `as` | タグ（標準 `"div"`。`"section"` `"li"` など） |
| `once` | 標準 `true`（一度出たら出たまま） |

- 画面を開いた時にすでに見えている所（ヒーローなど）は、開いた直後に出てきます
- 画面の下にある所は、スクロールで画面の少し手前まで来たら出てきます
- **`<Reveal>` の中は普通のサーバーコンポーネントのままで大丈夫です**

## 3. 順番に少しずつ出す：`<Stagger>`

**直接の子**が上から順に 45ms ずつずれて出ます（最初の 10 件まで）。

```tsx
<Stagger as="ul" className="grid gap-3">
  {items.map((item) => (
    <li key={item.id}>…</li>
  ))}
</Stagger>
```

子が直接の子でない時や、自分で順番を決めたい時は、`<Reveal index={i}>` か `staggerStyle(i)` を使います。

```tsx
{items.map((item, i) => (
  <Reveal key={item.id} index={i} variant="fade-up">…</Reveal>
))}

// タグを増やしたくない時
<li data-reveal="fade-up" style={staggerStyle(i)}>…</li>  // ※ 画面に入った判定は親の <Stagger> か useReveal で
```

## 4. 自分の要素に付けたい時：`useReveal` / `useInView`

```tsx
"use client";
const reveal = useReveal<HTMLDivElement>("fade-up");
return <div {...reveal} className="card">…</div>;

// 見えたかどうかだけ欲しい時（LINE フローのステップを順に光らせる、など）
const [ref, inView] = useInView<HTMLOListElement>();
return <ol ref={ref} data-active={inView ? "" : undefined}>…</ol>;
```

監視役（IntersectionObserver）はページ全体で 1 つだけ共有しているので、カードが何枚あっても軽いです。
判定は「15% 見えたら」「画面の下端より 10% 手前から」です（`threshold` と `rootMargin` で変えられます）。

## 5. 押した時・ホバーの反応（クラスを付けるだけ）

| クラス | 動き |
|---|---|
| `motion-press` | 押している間 0.98 倍に沈む（スマホのタップ・PC のクリック） |
| `motion-lift` | PC でマウスを乗せた時だけ 2px 浮いて影が付く（スマホでは何もしない） |
| `motion-pop` | 付いた瞬間に 1 回ポンと弾む |
| `motion-crossfade` | 表示された瞬間にフェードイン（`key` を変えると毎回動く） |

```tsx
<Link href={`/listings/${item.id}`} className="motion-press motion-lift block rounded-xl">…</Link>
```

### ★・♡ のポン：`usePop`

押すたびに確実に弾ませたい時はこちら（React がクラスを書き換えても止まりません）。

```tsx
"use client";
const [popRef, pop] = usePop<HTMLButtonElement>();
<button ref={popRef} onClick={() => { toggleFavorite(); pop(); }}>♡</button>
```

### ページ分けの中身の入れ替え

```tsx
<div key={page} className="motion-crossfade">
  {pageItems.map(…)}
</div>
```

## 6. フォームの開閉：`<Collapse>` / `useCollapse`

```tsx
"use client";
const sort = useCollapse();          // 最初から開くなら useCollapse(true)

<button {...sort.buttonProps}>並べ替え</button>
<Collapse {...sort.collapseProps}>
  <div className="pt-3">…並べ替えの中身…</div>
</Collapse>

// 自分で open を持っている時
<Collapse open={isOpen}>…</Collapse>
```

- **中身は小さめに保ってください。** 高さのアニメだけは transform にできないので、中身が大きいとスマホでカクつきます
- 余白（padding）は `<Collapse>` 自身ではなく、**中身の子要素**に付けてください（閉じた時に余白だけ残るのを防ぐため）
- 閉じている時も中身は残っています（`inert` なのでタップ・フォーカスはできません）。開いた時だけ作りたい重い中身は、今まで通り `{open && …}` を中に書いてください

## 7. 画面のつながり（View Transitions）

Next.js 16.3 からは**設定なしで**使えます（`experimental.viewTransition` はもう不要＝入れないでください）。
対応していないブラウザでは、普通に画面が切り替わるだけです。

### 一覧のサムネ → 詳細の写真

両方の画面で、同じ名前の `<SharedElement>` で写真を包みます。名前には必ず id を入れてください（同じ画面に同じ名前が 2 つあると動きません）。

```tsx
// 一覧のカード
<Link href={`/listings/${item.id}`} transitionTypes={[NAV_FORWARD]}>
  <SharedElement name={vtName("photo", item.id)}>
    <img src={item.photo} alt="" />
  </SharedElement>
</Link>

// 詳細の一番上の写真
<SharedElement name={vtName("photo", item.id)}>
  <img src={item.photo} alt="" />
</SharedElement>
```

- `<SharedElement>` は中の要素 1 つ（`img` や写真の箱）をそのまま包みます。余計なタグは増えません
- 詳細ページのデータを待つ間にローディング表示が出ると、つながりは出ずに普通に切り替わります（先読み済みなら動きます）

### コードでページ移動する時

```tsx
"use client";
import { useRouter } from "next/navigation";
const router = useRouter();
navigateWithTransition(router, `/listings/${id}`);              // 進む
navigateWithTransition(router, "/", { direction: "back" });      // 戻る
```

`<Link>` なら `transitionTypes={[NAV_FORWARD]}` / `transitionTypes={[NAV_BACK]}` を付けるだけです。
（左右にスライドする動きを付けたい時は、Next.js のガイド `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` の Step 3 を見て、ページ側に `<ViewTransition enter={…}>` を書きます。共通の CSS はまだ入れていません。）

### ページ移動以外の書き換え

```tsx
startViewTransition(() => setTab("compare"));
```

対応していないブラウザや「視差効果を減らす」の人には、ただ中身を実行します。**ページ移動には使わないでください。**

## 8. 「視差効果を減らす」

- CSS：自動です（時間の変数が 0 になり、隠す処理も行いません）
- JS で分岐したい時：

```tsx
const reduced = useReducedMotion();      // React の中
if (prefersReducedMotion()) { … }        // React の外
```

---

## 注意（スマホで滑らかに動かすために）

1. 動かすのは `transform` と `opacity` だけ。`top` `left` `width` `height` `margin` `box-shadow` を動かさない（`motion-lift` の影は PC だけ）
2. 一度にたくさん動かさない。時間差は 10 件まで（それ以降は同時に出ます）
3. 長いリストの全部に `<Reveal>` を付けない。最初の 1 画面ぶんだけ、または `<Stagger>` 1 つで
4. `filter: blur()` や `backdrop-filter` のアニメはしない（スマホで重い）
5. `<Reveal>` の箱に、自分で `animation` を付けない（出る動きとぶつかります）。押す・浮くのクラスは同じ箱でも大丈夫です

## ファイル一覧

| ファイル | 中身 |
|---|---|
| `tokens.ts` | 時間・カーブ・距離などの値 |
| `motion.css` | CSS 変数とクラス（layout で 1 回だけ読み込み） |
| `shared.ts` | `vtName`・`staggerStyle`・`NAV_FORWARD` / `NAV_BACK`（サーバーでも使える） |
| `use-in-view.ts` | `useInView`・`useReveal`・`observeInView`（共有の監視役） |
| `reveal.tsx` | `<Reveal>`・`<Stagger>` |
| `collapse.tsx` | `<Collapse>`・`useCollapse` |
| `pop.ts` | `usePop` |
| `view-transition.tsx` | `<SharedElement>`・`navigateWithTransition`・`startViewTransition`・`supportsViewTransitions` |
| `reduced-motion.ts` | `useReducedMotion`・`prefersReducedMotion` |
| `motion-boot.tsx` / `motion-ready.tsx` | `<MotionBoot>`（layout に入れ済み） |
| `index.ts` | まとめて読み込む入口 |
