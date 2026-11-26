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
| `step` | 時間差の間隔（ミリ秒）。中の子に引きつがれます |
| `immediate` / `when="mount"` | 画面に入るのを待たず、開いた瞬間から動き出します（最初の HTML から `data-revealed` が付きます）。ヒーロー向け |
| `skip` | `true` なら動きを付けず、最初から普通に見えます（一覧の先頭など、表示を速くしたい時） |
| その他 | `onClick`・`data-*`・`aria-*`・`id`・`ref` など、`as` のタグが受け取れるものは全部そのまま渡ります。`style` は時間差用の CSS 変数とまとめて渡します |

- 画面を開いた時にすでに見えている所（ヒーローなど）は、開いた直後に出てきます
- 画面の下にある所は、スクロールで画面の少し手前まで来たら出てきます
- **`<Reveal>` の中は普通のサーバーコンポーネントのままで大丈夫です**

```tsx
// クリックや data-* もそのまま渡ります
<Reveal as="li" index={i} onClick={() => open(item.id)} data-id={item.id} aria-label={item.title}>…</Reveal>

// as に Link などの部品を渡すと、その props（href など）も型どおりに使えます。
// ※ これは "use client" のファイルの中だけ。サーバーコンポーネントからは部品を as に渡せないので、
//    <Reveal><Link …>…</Link></Reveal> のように中に入れてください（onClick も同じく "use client" の中だけ）
<Reveal as={Link} href={`/listings/${item.id}`} className="block">…</Reveal>
```

### 開いた瞬間から動かす（ヒーロー）

画面に入る待ち（IntersectionObserver や hydration）をせず、最初の描画から動き出します。
もなかさんが仮で書いていた `data-reveal="fade-up" data-revealed=""` の正式な書き方です。

```tsx
<Reveal variant="fade-up" immediate>
  <Image src="/gtr-hero-3.jpg" alt="…" priority />
</Reveal>
{/* when="mount" でも同じです */}
<Reveal variant="fade-up" when="mount" delay={45}>見出し</Reveal>
```

※ 動き自体は付くので、いちばん大きい写真の表示を速くしたい時は、次の `skip` を使ってください。

### 動きを付けない（表示を速くする）

```tsx
<Reveal skip>先頭のカード（LCP 用。最初から普通に見える）</Reveal>
```

## 3. 順番に少しずつ出す：`<Stagger>`

**直接の子**が上から順に 45ms ずつずれて出ます（最初の 10 件まで）。

```tsx
<Stagger as="ul" className="grid gap-3">
  {items.map((item) => (
    <li key={item.id}>…</li>
  ))}
</Stagger>
```

先頭の何件かを動きなしですぐ出す（一覧の 1 枚目の写真を速く出したい時）には `skip` を付けます。残りの件は 0 番から数え直してずれます。

```tsx
<Stagger as="ul" className="grid gap-3" skip={1}>
  {items.map((item) => (
    <li key={item.id}>…</li>   {/* 1 枚目は動きなし、2 枚目からふわっと出る */}
  ))}
</Stagger>
{/* skipFirst は skip={1} と同じ */}
<Stagger skipFirst>…</Stagger>
```

`<Stagger>` も `<Reveal>` と同じく、`onClick`・`data-*`・`aria-*`・`ref`、それに `immediate` / `when="mount"` も使えます。

### 吹き出しなどを、ゆっくり順番に出す

`step` で間隔を広げます（標準は 45ms）。

```tsx
<Stagger className="flex flex-col gap-2.5" variant="fade-up" step={500} delay={150}>
  <div>URLの吹き出し</div>                 {/* ← 直接の子が 0.5 秒ずつ順番に出る */}
  <div>「保存しました」の吹き出し</div>
</Stagger>
```

※ `<Stagger>` の直接の子は全部同じ `variant`（親の値）で出ます。子ごとに向きを変えたい時は、
`<Reveal variant="slide-right" step={500} index={0}>` / `<Reveal variant="slide-left" step={500} index={1}>` のように
`index` と `step` を自分で付けてください。

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

### 保存中のくるくる：`.motion-spin` / `<Spinner>`

CSS だけなので軽いです。「視差効果を減らす」の人には止まります（円だけ見えます）。保存が終わったら、アイコンをチェックに差し替えて `motion-pop` を付ける使い方がおすすめです。

```tsx
<button disabled={saving || saved}>
  {saving ? (
    <>
      <Spinner label="保存しています" />
      保存中…
    </>
  ) : saved ? (
    <>
      <Check className="motion-pop size-4" strokeWidth={3} aria-hidden />
      のこす
    </>
  ) : (
    "のこす"
  )}
</button>

{/* すでに lucide などのアイコンがあるときは、クラスを付けるだけでも回ります */}
<LoaderCircle className="motion-spin size-4" aria-hidden />
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

## 6.5 消える時の動き：`<Presence>` / `usePresence`

`{open && …}` だと消える時は一瞬で消えますが、`<Presence>` で包むと**消える動きが終わってから**外れます。
動かすのは transform と opacity だけ。「視差効果を減らす」の人にはすぐ消えます。
消える動きが何かで止まっても、最長 0.4 秒（`timeout`）で必ず外れます。

```tsx
<Presence show={sheetOpen} variant="fade-down" className="rounded-xl bg-white p-4" onClick={…}>
  共有シートの中身
</Presence>

// 最初の表示でも「出る」動きをしたい時
<Presence show={toast} variant="fade-up" appear>保存しました</Presence>
```

| `variant` | 消える時 | 出る時 |
|---|---|---|
| `"fade"`（標準） | その場で透明に | その場でふわっと |
| `"fade-up"` | 上へ少し動いて消える | 上から降りてくる |
| `"fade-down"` | 下へ少し動いて消える | 下から上がってくる |
| `"scale-out"` | 少し縮んで消える | 少し小さい所から |

その他の props：`as`（タグ）、`appear`、`timeout`（ミリ秒）、`onClick`・`data-*`・`aria-*`・`ref` などはそのまま渡ります。

自分の要素で使いたい時はフック版：

```tsx
"use client";
const p = usePresence<HTMLDivElement>(open);
{p.mounted && (
  <div ref={p.ref} data-presence="scale-out" data-presence-state={p.state}>…</div>
)}
```

- 高さが変わる開閉は `<Collapse>`、出たり消えたりする小さな箱（トースト・シート・バッジ）は `<Presence>` が向いています
- `<Presence>` で消える要素は、消えている間タップできません（`pointer-events: none`）

## 6.6 ステップの丸：`<StepDots>` / `.motion-step-dot`

画面に入ると、丸が 1 つずつ中から色で埋まります（`::before` を拡大するだけなので軽い）。
色は `--motion-step-color`（**おく＝黄 `var(--yahoo)`、のこす＝オレンジ `var(--orange)`** が最初から入っています）。
JS が動かない時や「視差効果を減らす」の人には、最初から埋まって見えます。

### 丸だけを並べる（進み具合の表示）

```tsx
<StepDots count={3} />                                   // 小さな丸 3 つ。見えたら順に埋まる
<StepDots count={4} filled={2} />                        // 2 つ目まで埋まる（進み具合）
<StepDots count={3} labels dotClassName="size-6 text-xs font-bold" />   // 中に 1, 2, 3
<StepDots count={3} color="#06C755" step={300} />        // 色と間隔を変える
```

### ステップのカードの中に番号の丸を置く（きなこさんの使い方）

`<Reveal>` や `<Stagger>` の中に `.motion-step-dot` を置くだけです。親が出たあと、少し遅れて（`--motion-step-lag` 150ms）埋まります。
順番は親の `index`（または `<Stagger>` の並び順）にそろいます。

```tsx
<ol className="grid gap-4">
  {steps.map((step, i) => (
    <Reveal as="li" index={i} key={step.title}>
      <span className="motion-step-dot size-6 border border-[#E5C200] text-xs font-extrabold">{i + 1}</span>
      {step.title}
    </Reveal>
  ))}
</ol>
```

- まだ埋めたくない丸には `data-pending` を付けます：`<span className="motion-step-dot" data-pending={done ? undefined : ""}>`
- 色を変える：親か丸の `style={{ "--motion-step-color": "#06C755" } as React.CSSProperties}`

---

## きなこさんへ：`.oku-step-dot` からの乗りかえ

1. `components/landing-line-flow.tsx` の `className="oku-step-dot …"` を `className="motion-step-dot …"` に変える（ほかのクラスはそのまま）
2. `app/globals.css` の `.oku-step-dot` と `.oku-step-dot::before`、`html.motion-js.motion-ready … .oku-step-dot::before` の 3 つのブロックを消す
3. 色は `var(--yahoo)` のまま変わりません。`grid place-items-center rounded-full` などの Tailwind クラスは付けたままで大丈夫です（`motion-step-dot` の形の初期値より Tailwind のクラスが優先されます）

`.oku-card-press`（中のリンクを押した時だけ沈む）と `.oku-dots`（つないでいます…の点）は、おくだけで使っているのでそのままで大丈夫です。

## もなかさんへ

仮の書き方からの乗りかえです（今の使い方はそのまま動きます）。

- ヒーローの `data-reveal="fade-up" data-revealed=""` → `<Reveal variant="fade-up" immediate>`（`when="mount"` でも同じ）
- 一覧の先頭カードを動きなしにする → `<Stagger skip={1}>` または `<Reveal skip>`
- 保存中の `motion-safe:animate-spin` → `className="motion-spin"` または `<Spinner label="保存しています" />`。終わったら今どおり `<Check className="motion-pop" />`
- 番号の丸は `.motion-step-dot`（色は自動でオレンジ）、吹き出しは `<Stagger step={500}>` か `<Reveal index step>`
- 共有シートやトーストの「消える動き」は `<Presence>`
- `data-*` / `onClick` は `<Reveal>` にそのまま渡せます

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
| `presence.tsx` | `<Presence>`・`usePresence`（消える動き） |
| `step-dots.tsx` | `<StepDots>`（ステップの丸） |
| `merge-refs.ts` | `useMergedRef`（ref を 2 つにまとめる） |
| `spinner.tsx` | `<Spinner>`（保存中のくるくる） |
| `collapse.tsx` | `<Collapse>`・`useCollapse` |
| `pop.ts` | `usePop` |
| `view-transition.tsx` | `<SharedElement>`・`navigateWithTransition`・`startViewTransition`・`supportsViewTransitions` |
| `reduced-motion.ts` | `useReducedMotion`・`prefersReducedMotion` |
| `motion-boot.tsx` / `motion-ready.tsx` | `<MotionBoot>`（layout に入れ済み） |
| `index.ts` | まとめて読み込む入口 |
