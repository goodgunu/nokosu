"use client";

import { useState } from "react";
import Image from "next/image";
import { BadgeCheck, Camera, JapaneseYen, ListChecks, NotebookPen, Store } from "lucide-react";
import { MockList } from "@/components/landing-mocks";
import { LandingLineFlow } from "@/components/landing-line-flow";
import { LoginOptions } from "@/components/login-options";
import { LineAddLink, LINE_ACCOUNT_ID } from "@/components/line-add-link";
import { Wordmark } from "@/components/wordmark";

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

  function openLogin(nextUrl?: string) {
    const pending = (nextUrl ?? url).trim();
    if (pending) sessionStorage.setItem("nokosu-pending-url", pending);
    setShowLogin(true);
  }

  return (
    <div className="min-h-full" style={{ background: "#FFFFFF", color: "#1C1917" }}>
      <header style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-3 py-3.5 sm:gap-4 sm:px-7">
          <span className="shrink-0 [&_img]:h-[22px] [&_img]:w-auto sm:[&_img]:h-[26px]"><Wordmark height={26} /></span>
          <p className="min-w-0 flex-1 text-xs leading-[15px] font-normal text-white/80 sm:leading-4">気になる車を、<br />いつでも見返せる場所。</p>
          <a href="#line-flow" className="hidden text-sm sm:inline">
            使い方
          </a>
          <a
            href="/api/auth/line-login?next=%2F"
            className="inline-flex shrink-0 items-center rounded-full px-2 py-1.5 text-[10px] font-bold text-white sm:px-3.5 sm:text-sm"
            style={{ background: "#06C755" }}
            onClick={() => {
              const pending = url.trim();
              if (pending) sessionStorage.setItem("nokosu-pending-url", pending);
            }}
          >
            LINEで連携
          </a>
          <button
            type="button"
            className="shrink-0 rounded-full px-2 py-1.5 text-[10px] font-bold sm:px-3.5 sm:text-sm"
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

      <section id="after" className="px-4 pt-5 pb-7 sm:px-7" style={{ background: "#F9E3D0" }}>
        <div className="mx-auto max-w-6xl">
          <div className="max-w-md">
            <h2 className="text-lg font-bold">残る</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">売約して掲載が終わっても、アカウントに残る。メモも書ける。</p>
            <MockList />
          </div>
        </div>
      </section>

      <section style={{ background: "#E7F6EC" }}>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
          <div>
            <h2 className="text-lg font-bold">LINEに送ると、その場で残る</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-7">
              下のボタンで公式LINE「のこす」を友だち追加します。IDは {LINE_ACCOUNT_ID} です。追加したあと、各サイトの共有から「のこす」を選ぶと、アカウントに保存されます。
            </p>
            <div className="mt-4">
              <LineAddLink />
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-5 sm:px-7">
          <Wordmark height={22} />
          <p className="text-xs text-white/80">気になる車を、いつでも見返せる場所。</p>
          <span className="flex-1" />
          <a href="/privacy" className="text-xs">プライバシーポリシー</a>
          <a href="/terms" className="text-xs">利用規約</a>
        </div>
      </footer>
    </div>
  );
}
