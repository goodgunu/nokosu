"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BadgeCheck, Camera, JapaneseYen, ListChecks, NotebookPen, Store } from "lucide-react";
import { MockList } from "@/components/landing-mocks";
import { LandingLineFlow } from "@/components/landing-line-flow";
import { LoginOptions } from "@/components/login-options";
import { LineAddLink, LINE_ACCOUNT_ID, LINE_ADD_FRIEND_URL } from "@/components/line-add-link";
import { Wordmark } from "@/components/wordmark";
import { Reveal, Stagger } from "@/lib/motion";

const kept = [
  ["写真", "掲載の写真を選んで残す", Camera],
  ["支払総額", "本体価格と諸費用も", JapaneseYen],
  ["状態", "年式、距離、修復歴、車検", BadgeCheck],
  ["装備", "ナビ、ETC、スマートキー", ListChecks],
  ["販売店・出品者", "店名・出品者名と所在地", Store],
  ["メモ", "エアロ、車高調、ホイールなどのカスタム内容", NotebookPen],
] as const;

const SITES = ["カーセンサー", "グーネット", "カババ", "ヤフオク"] as const;

export function LandingPage() {
  const [url, setUrl] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [xError, setXError] = useState("");
  const [urlError, setUrlError] = useState("");

  // ログイン画面の「Xで続ける」で失敗して戻ってきたときの文言（/sso-callback が保存する）
  useEffect(() => {
    const stored = sessionStorage.getItem("nokosu-x-sso-error");
    if (stored) {
      sessionStorage.removeItem("nokosu-x-sso-error");
      setXError(stored);
    }
  }, []);

  function openLogin(nextUrl?: string) {
    const pending = (nextUrl ?? url).trim();
    if (pending) sessionStorage.setItem("nokosu-pending-url", pending);
    setShowLogin(true);
  }

  return (
    <div className="min-h-full" style={{ background: "#FFFFFF", color: "#1C1917" }}>
      <header style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 px-3 py-2 sm:gap-3 sm:px-7">
          <span className="shrink-0 [&_img]:h-[22px] [&_img]:w-auto sm:[&_img]:h-[26px]"><Wordmark height={26} /></span>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2.5" aria-label="ログインと使い方">
            <a href="#line-flow" className="inline-flex h-11 items-center px-1.5 text-xs font-bold whitespace-nowrap sm:px-2 sm:text-sm">
              使い方
            </a>
            <a
              href="/api/auth/line-login?next=%2F"
              className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-xs font-bold text-white sm:px-4 sm:text-sm"
              style={{ background: "#06C755" }}
              data-control="header-line"
              onClick={() => {
                const pending = url.trim();
                if (pending) sessionStorage.setItem("nokosu-pending-url", pending);
              }}
            >
              LINEではじめる
            </a>
            <button
              type="button"
              className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-xs font-bold sm:px-4 sm:text-sm"
              style={{ background: "#FFFFFF", color: "#9C3D12" }}
              data-control="header-other"
              onClick={() => openLogin()}
            >
              <span className="sm:hidden">ほかの方法</span>
              <span className="hidden sm:inline">メール・Googleなど</span>
            </button>
          </nav>
        </div>
      </header>
      {xError ? (
        <p role="alert" className="px-4 py-2 text-center text-xs font-bold" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
          {xError}
        </p>
      ) : null}

      <section style={{ background: "#F8D3B8", color: "#1C1917" }}>
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-7 sm:pt-8">
          <Reveal skip className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl sm:aspect-[16/8]">
            <Image
              src="/gtr-hero-3.jpg"
              alt="オレンジのGT-Rの写真"
              fill
              loading="eager"
              fetchPriority="high"
              // 枠の余白を引いた幅（px-4=32px、sm:px-7=56px、最大は max-w-6xl から余白を引いた 1096px）。
              // 100vw だと、高解像度のスマホで必要以上に大きい画像を取りにいくことがある。
              sizes="(min-width: 1152px) 1096px, (min-width: 640px) calc(100vw - 56px), calc(100vw - 32px)"
              className="object-cover"
              style={{ objectPosition: "50% 55%" }}
            />
          </Reveal>
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:px-7 sm:py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)] lg:gap-8">
          <Reveal variant="fade-up" immediate index={1}>
            <p className="text-xs font-bold tracking-[0.14em]" style={{ color: "#E4682C" }}>
              売約や掲載終了の前に
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
          </Reveal>
          <Reveal
            as="form"
            variant="fade-up"
            immediate
            index={2}
            className="text-foreground rounded-xl bg-white p-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const value = url.trim();
              if (!value) {
                setUrlError("中古車の詳細ページのURLを貼ってください。");
                document.getElementById("landing-url")?.focus();
                return;
              }
              if (!/^https?:\/\//i.test(value)) {
                setUrlError("「https://」から始まるURLを貼ってください。");
                document.getElementById("landing-url")?.focus();
                return;
              }
              setUrlError("");
              openLogin(value);
            }}
          >
            <p className="text-sm font-bold">対応サイト</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="対応サイト" data-landing="sites">
              {SITES.map((site) => (
                <li key={site} className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: "#FFF1E6", color: "#9C3D12" }}>
                  {site}
                </li>
              ))}
            </ul>
            <label htmlFor="landing-url" className="mt-3 block text-xs" style={{ color: "#57534E" }}>
              中古車の詳細ページのURL
            </label>
            <input
              id="landing-url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (urlError) setUrlError("");
              }}
              placeholder="https://… をここに貼る"
              className="mt-1.5 w-full rounded-lg border px-3 py-3 text-base sm:text-sm"
              style={{ borderColor: urlError ? "#DC2626" : "#E5E5E5" }}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              aria-invalid={urlError ? true : undefined}
              aria-describedby={urlError ? "landing-url-error" : undefined}
            />
            {urlError ? (
              <p id="landing-url-error" role="alert" className="mt-1.5 text-xs font-bold" style={{ color: "#B91C1C" }}>
                {urlError}
              </p>
            ) : null}
            <button type="submit" className="mt-2.5 w-full rounded-lg py-3 text-[15px] font-bold text-white" style={{ background: "#E4682C" }} >
              掲載を残す
            </button>
            <p className="text-muted-foreground mt-2.5 text-[11px] leading-5">
              価格、写真、装備、販売店を読み取ります。写真はあとから選べます。
            </p>
          </Reveal>
        </div>
      </section>

      <section id="daily-check" style={{ background: "#E7692F", color: "#FFFFFF" }}>
        <Stagger className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-9 sm:px-7 sm:py-12 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-white/85">毎朝、自動でチェック</p>
            <h2 className="mt-2 text-[1.65rem] leading-snug font-extrabold tracking-tight sm:text-4xl">
              毎日自動で確認。
              <br />
              値下げもすぐわかる。
            </h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/95 sm:text-base">
              残した掲載は、毎朝自動でチェック。価格が下がると、一覧に「値下げ」と出ます。
            </p>
            <div className="mt-5 max-w-md rounded-2xl bg-white p-4 shadow-lg" style={{ color: "#1C1917" }} data-promo-line>
              <p className="flex items-center gap-2 text-base font-extrabold">
                <span className="grid size-7 shrink-0 place-items-center rounded-full" style={{ background: "#06C755" }} aria-hidden>
                  <Image src="/icon-line.png" alt="" width={16} height={15} />
                </span>
                値下げや売約を、LINEでお知らせ
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "#57534E" }}>
                LINEで連携すると、お気に入りに入れた車の値下げや掲載終了が見つかった朝に、LINEへお知らせが届きます（1日1通にまとめます）。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="/api/auth/line-login?next=%2F"
                  className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold text-white"
                  style={{ background: "#06C755" }}
                  onClick={() => {
                    const pending = url.trim();
                    if (pending) sessionStorage.setItem("nokosu-pending-url", pending);
                  }}
                >
                  LINEで連携
                </a>
                <a
                  href={LINE_ADD_FRIEND_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-full border-2 px-4 text-sm font-bold"
                  style={{ borderColor: "#06C755", color: "#05813A" }}
                >
                  公式LINEを友だち追加
                </a>
              </div>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lg lg:mx-0" style={{ color: "#1C1917" }} data-promo-card>
            <div className="relative aspect-[16/10] w-full">
              <Image src="/gtr-hero-3.jpg" alt="例のオレンジのGT-R" fill sizes="(min-width: 1024px) 384px, 90vw" className="object-cover" style={{ objectPosition: "30% 50%" }} />
              <span className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow" style={{ background: "#E7692F" }}>例</span>
            </div>
            <div className="border-t-2 p-4" style={{ borderTopColor: "#E7692F" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium" style={{ color: "#6B6560" }}>日産</p>
                <span className="text-[11px]" style={{ color: "#6B6560" }}>今朝の確認</span>
              </div>
              <p className="mt-0.5 text-[17px] leading-snug font-bold">GT-R プレミアムエディション</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[11px] font-bold" style={{ color: "#6B6560" }}>支払総額</span>
                <span className="text-base font-bold tabular-nums line-through decoration-2" style={{ color: "#9A948E" }}>1,280万円</span>
                <span className="text-lg font-bold" style={{ color: "#E7692F" }} aria-hidden>→</span>
                <span className="text-[2rem] leading-none font-extrabold tabular-nums" style={{ color: "#E7692F" }}>1,270<span className="text-sm font-bold" style={{ color: "#1C1917" }}>万円</span></span>
              </div>
              <p className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-bold" style={{ background: "#E7F6EC", color: "#05813A" }}>
                10万円値下げ
              </p>
              <p className="mt-2.5 text-[11px] leading-5" style={{ color: "#6B6560" }}>※ 表示のイメージです。実際の金額ではありません。</p>
            </div>
          </div>
        </Stagger>
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
            <h2 className="mt-1 text-lg font-bold">のこすをはじめる</h2>
            <p className="text-muted-foreground mt-1 mb-4 text-xs leading-5">はじめての方は、そのまま登録されます。登録済みの方はそのままログインできます。</p>
            <LoginOptions />
            <button type="button" className="text-muted-foreground mt-3 w-full text-xs" onClick={() => setShowLogin(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}

      <section className="px-4 py-8 sm:px-7" style={{ background: "#FFF6EF" }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-lg font-bold">アカウントに残るもの</h2>
          <Stagger as="ul" className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
            {kept.map(([title, body, Icon]) => (
              <li key={title} className="rounded-2xl border bg-white p-3.5 shadow-sm sm:p-4" style={{ borderColor: "#F0C8AE" }}>
                <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: "#E4682C" }}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <p className="mt-2.5 text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "#6B6560" }}>{body}</p>
              </li>
            ))}
          </Stagger>
        </div>
      </section>

      <section id="after" className="px-4 pt-5 pb-7 sm:px-7" style={{ background: "#F9E3D0" }}>
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-md">
            <h2 className="text-lg font-bold">残る</h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">売約して掲載が終わっても、アカウントに残る。メモも書ける。</p>
            <MockList />
          </Reveal>
        </div>
      </section>

      <LandingLineFlow />

      <section style={{ background: "#E7F6EC" }}>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7">
          <Reveal>
            <h2 className="text-lg font-bold">LINEに送ると、その場で残る</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-7">
              下のボタンで公式LINE「のこす」を友だち追加します。IDは {LINE_ACCOUNT_ID} です。追加したあと、各サイトの共有から「のこす」を選ぶと、アカウントに保存されます。
            </p>
            <div className="mt-4">
              <LineAddLink />
            </div>
          </Reveal>
        </div>
      </section>

      <footer style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Wordmark height={22} />
            <p className="text-xs text-white/90">気になる車を、いつでも見返せる場所。</p>
            <span className="flex-1" />
            <nav className="-mx-2 flex flex-wrap" aria-label="規約">
              <a href="/privacy" className="inline-flex min-h-11 items-center px-2 text-sm font-bold underline-offset-4 hover:underline">プライバシーポリシー</a>
              <a href="/terms" className="inline-flex min-h-11 items-center px-2 text-sm font-bold underline-offset-4 hover:underline">利用規約</a>
            </nav>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/90" data-landing="disclaimer">
            のこすは個人が運営するサービスで、カーセンサー・グーネット・カババ・ヤフオクなど各サイトの公式サービスではありません。掲載の文章と写真の権利は、販売店・出品者と各サイトにあります。
          </p>
        </div>
      </footer>
    </div>
  );
}
