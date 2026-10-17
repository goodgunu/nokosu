"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, Camera, JapaneseYen, ListChecks, NotebookPen, Store } from "lucide-react";
import { LandingLineFlow } from "@/components/landing-line-flow";
import { MockDetail, MockList, MockSend } from "@/components/landing-mocks";
import { LoginOptions } from "@/components/login-options";
import { LineAddLink, LINE_ACCOUNT_ID } from "@/components/line-add-link";
import { Mark, Wordmark } from "@/components/wordmark";
import { SpecChip } from "@/components/spec-chip";
import { SOURCE_BADGE_CLASS } from "@/components/source-badge";
import { SOURCE_LABEL } from "@/lib/sites";

// 実際の一覧カードに近い見た目のサンプル（ゆうがさんの車）
function SampleCard({ live }: { live: boolean }) {
  return (
    <div className="border-border overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden">
        <Image src="/86-card.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 448px" className={`object-cover ${live ? "" : "grayscale"}`} />
      </div>
      <div className="border-t-2 p-3 pb-3.5 sm:p-4" style={{ borderColor: "#E4682C" }}>
        <p className="text-muted-foreground text-xs font-medium tracking-wide">トヨタ</p>
        <p className="text-[17px] leading-snug font-bold">86 GT</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="flex items-baseline gap-1 leading-none">
            <span className="text-muted-foreground text-[11px] font-bold">支払総額</span>
            <span className="text-[26px] font-extrabold tabular-nums" style={{ color: "#E4682C" }}>238.6</span>
            <span className="text-sm font-bold">万円</span>
          </p>
          <p className="text-muted-foreground text-[15px]">
            車体価格 <span className="text-foreground font-medium tabular-nums">229万円</span>
          </p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <SpecChip label="年式" value="2017年" />
          <SpecChip label="走行" value="5.2万km" />
          <SpecChip label="色" value="ブラック" />
        </div>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
          <span className={`mr-1 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] leading-none font-bold ${SOURCE_BADGE_CLASS.kabaha}`}>
            {SOURCE_LABEL.kabaha}
          </span>
          <span className={live ? "text-live font-bold" : "font-bold text-black"}>{live ? "掲載中" : "掲載終了"}</span>
          <span className="text-muted-foreground"> ・ 検討中 ・ 愛知県</span>
        </p>
      </div>
    </div>
  );
}

const mocks = [<MockSend key="send" />, <MockDetail key="detail" />, <MockList key="list" />];

const steps = [
  ["01", "送る", "URLを貼る。またはカーセンサー・グーネット・カババ・ヤフオクの共有から、LINEの「のこす」へ送る。"],
  ["02", "読み取る", "支払総額、写真、スペック、装備、販売店・出品者を取り込む。"],
  ["03", "残る", "売約して掲載が終わっても、アカウントに残る。メモも書ける。"],
];

const kept = [
  ["写真", "掲載の写真を選んで残す", Camera],
  ["支払総額", "本体価格と諸費用も", JapaneseYen],
  ["状態", "年式、距離、修復歴、車検", BadgeCheck],
  ["装備", "ナビ、ETC、スマートキー", ListChecks],
  ["販売店・出品者", "店名・出品者名と所在地", Store],
  ["メモ", "エアロ、車高調、ホイールなどのカスタム内容", NotebookPen],
] as const;

export function LandingPage() {
  const [url, setUrl] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [live, setLive] = useState(true);

  function openLogin(nextUrl?: string) {
    const pending = (nextUrl ?? url).trim();
    if (pending) sessionStorage.setItem("nokosu-pending-url", pending);
    setShowLogin(true);
  }

  return (
    <div className="min-h-full" style={{ background: "#FFFFFF", color: "#1C1917" }}>
      <header style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5 sm:px-7">
          <Wordmark height={26} />
          <span className="flex-1" />
          <a href="#how" className="hidden text-sm sm:inline">
            使い方
          </a>
          <button
            type="button"
            className="rounded-full px-3.5 py-1.5 text-sm font-bold"
            style={{ background: "#FFFFFF", color: "#E4682C" }}
            onClick={() => openLogin()}
          >
            はじめる
          </button>
        </div>
      </header>

      <section style={{ background: "#F8D3B8", color: "#1C1917" }}>
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-7 sm:pt-8">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl sm:aspect-[16/7]">
            <Image
              src="/gtr-hero.jpg"
              alt="白いGT-Rの写真"
              fill
              priority
              sizes="(min-width: 1152px) 1100px, 100vw"
              className="object-cover"
              style={{ objectPosition: "50% 55%" }}
            />
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:px-7 sm:py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)] lg:gap-8">
          <div>
            <p className="text-xs font-bold tracking-[0.14em]" style={{ color: "#E4682C" }}>
              売約の前に
            </p>
            <h1 className="mt-2 text-[1.7rem] leading-snug font-bold tracking-tight sm:text-4xl">
              気になった車を、
              <br />
              消える前に残す。
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 sm:text-base">
              中古車の掲載は、売約や掲載期間が終わると開けなくなります。URLを残すと、価格も写真も、自分のアカウントに残ります。
            </p>
            <p className="mt-3 text-xs leading-6 sm:text-sm" style={{ color: "#9C3D12" }}>
              公式アプリの共有から、LINEの「のこす」に送っても残せます。
            </p>
          </div>
          <form
            className="text-foreground rounded-xl bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              openLogin(url);
            }}
          >
            <label htmlFor="landing-url" className="text-muted-foreground text-xs">
              中古車の詳細ページURL
            </label>
            <input
              id="landing-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="カーセンサー・グーネット・カババ・ヤフオクのURL"
              className="border-border mt-2 w-full rounded-lg border px-3 py-3 text-sm"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button type="submit" className="mt-2.5 w-full rounded-lg py-3 text-[15px] font-bold text-white" style={{ background: "#E4682C" }} >
              掲載を残す
            </button>
            <p className="text-muted-foreground mt-2.5 text-[11px] leading-5">
              価格、写真、装備、販売店を読み取ります。写真はあとから選べます。
            </p>
          </form>
        </div>
      </section>

      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowLogin(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="text-xs font-bold tracking-[0.14em]" style={{ color: "#E4682C" }}>ログイン・新規登録</p>
            <h2 className="mt-1 text-lg font-bold">はじめる</h2>
            <p className="text-muted-foreground mt-1 mb-4 text-xs leading-5">はじめての方は、そのまま登録されます。登録済みの方はそのままログインできます。</p>
            <LoginOptions />
            <button type="button" className="text-muted-foreground mt-3 w-full text-xs" onClick={() => setShowLogin(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}

      <section id="how" className="px-4 py-8 sm:px-7" style={{ background: "#FFFFFF" }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-bold tracking-[0.08em]" style={{ color: "#E4682C" }}>使い方</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {steps.map(([n, title, body], index) => (
              <li
                key={n}
                className="rounded-2xl p-4"
                style={{ background: index === 2 ? "#F8D3B8" : "#FFF6EF" }}
              >
                <p className="text-xs font-bold" style={{ color: "#E4682C" }}>{n}</p>
                <p className="mt-1 text-base font-bold">{title}</p>
                <p className="mt-1.5 text-sm leading-7" style={{ color: "#6B6560" }}>{body}</p>
                {mocks[index]}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <LandingLineFlow />

      <section className="px-4 py-8 sm:px-7" style={{ background: "#FFF6EF" }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-lg font-bold">アカウントに残るもの</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
            {kept.map(([title, body, Icon]) => (
              <li key={title} className="rounded-2xl border bg-white p-3.5 shadow-sm sm:p-4" style={{ borderColor: "#F0C8AE" }}>
                <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: "#E4682C" }}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <p className="mt-2.5 text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "#6B6560" }}>{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="after" className="bg-card px-4 pt-5 pb-7 sm:px-7">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold">残したあとの画面</h2>
            <span className="flex-1" />
            <button type="button" className={`text-xs ${live ? "font-bold" : ""}`} style={{ color: live ? "#E4682C" : "#6B6560" }} onClick={() => setLive(true)}>
              掲載中
            </button>
            <button type="button" className={`text-xs ${live ? "" : "font-bold"}`} style={{ color: live ? "#6B6560" : "#9C3D12" }} onClick={() => setLive(false)}>
              掲載終了
            </button>
          </div>
          <div className="mt-3 max-w-md">
            <SampleCard live={live} />
          </div>
        </div>
      </section>

      <section style={{ background: "#E7F6EC" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 py-6 sm:px-7 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-lg font-bold">LINEに送ると、その場で残る</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-7">
              下のボタンで公式LINE「のこす」を友だち追加します。IDは {LINE_ACCOUNT_ID} です。追加したあと、各サイトの共有から「のこす」を選ぶと、アカウントに保存されます。
            </p>
            <div className="mt-4">
              <LineAddLink />
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mark size={36} />
            <div className="border-border w-full max-w-[260px] overflow-hidden rounded-xl border bg-white text-xs">
              <div className="relative aspect-[16/10] w-full">
                <Image src="/86-card.jpg" alt="" fill sizes="260px" className="object-cover" />
              </div>
              <div className="border-t-2 px-3 py-2 leading-5" style={{ borderColor: "#E4682C" }}>
                <p className="font-bold" style={{ color: "#E4682C" }}>保存しました</p>
                <p className="font-bold">トヨタ 86 GT</p>
                <p>
                  <span className="font-extrabold" style={{ color: "#E4682C" }}>238.6</span>万円 ・ <span className="font-bold text-live">掲載中</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-5 sm:px-7">
          <Wordmark height={22} />
          <p className="text-xs text-white/80">中古車の掲載を、自分のアカウントに残す。</p>
          <span className="flex-1" />
          <a href="/privacy" className="text-xs">プライバシーポリシー</a>
          <a href="/terms" className="text-xs">利用規約</a>
        </div>
      </footer>
    </div>
  );
}
