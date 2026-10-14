"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import { Mark, Wordmark } from "@/components/wordmark";

const steps = [
  ["01", "送る", "URLを貼る。またはカーセンサーの共有から、LINEの「のこす」へ送る。"],
  ["02", "読み取る", "支払総額、写真、スペック、装備、販売店を取り込む。"],
  ["03", "残る", "売約して掲載が終わっても、アカウントに残る。メモも書ける。"],
];

const kept = [
  ["写真", "掲載の写真を選んで残す"],
  ["支払総額", "本体価格と諸費用も"],
  ["状態", "年式、距離、修復歴、車検"],
  ["装備", "ナビ、ETC、スマートキー"],
  ["販売店", "店名と所在地"],
  ["メモ", "電話した日、見た傷"],
];

export function LandingPage() {
  const { signIn, fetchStatus } = useSignIn();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [live, setLive] = useState(true);
  const ready = fetchStatus !== "fetching";

  async function login(nextUrl?: string) {
    if (!ready || busy) return;
    setBusy(true);
    setNotice("");
    const pending = (nextUrl ?? url).trim();
    if (pending) sessionStorage.setItem("nokosu-pending-url", pending);
    try {
      const result = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: "/",
        redirectCallbackUrl: "/sso-callback",
        oidcPrompt: "select_account",
      });
      if (result.error) {
        setBusy(false);
        setNotice(result.error.message || "Googleのログインを開始できませんでした。");
      }
    } catch (error) {
      setBusy(false);
      setNotice(error instanceof Error ? error.message : "Googleのログインを開始できませんでした。");
    }
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
          <button type="button" className="text-sm" onClick={() => void login()}>
            ログイン
          </button>
          <button
            type="button"
            className="rounded-full px-3.5 py-1.5 text-sm font-bold"
            style={{ background: "#FFFFFF", color: "#E4682C" }}
            onClick={() => void login()}
          >
            掲載を残す
          </button>
        </div>
      </header>

      <section style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-4 pb-9 sm:px-7 sm:pt-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)] lg:gap-8">
          <div>
            <h1 className="text-[1.7rem] leading-snug font-bold tracking-tight sm:text-4xl">
              気になった車を、
              <br />
              消える前に残す。
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 sm:text-base">
              カーセンサーの掲載は、売約や掲載期間が終わると開けなくなります。URLを残すと、価格も写真も、自分のアカウントに残ります。
            </p>
            <p className="mt-3 text-xs leading-6 text-white/85 sm:text-sm">
              公式アプリの共有から、LINEの「のこす」に送っても残せます。
            </p>
          </div>
          <form
            className="text-foreground rounded-xl bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void login(url);
            }}
          >
            <label htmlFor="landing-url" className="text-muted-foreground text-xs">
              カーセンサーのURL
            </label>
            <input
              id="landing-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.carsensor.net/usedcar/detail/…"
              className="border-border mt-2 w-full rounded-lg border px-3 py-3 text-sm"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button type="submit" className="mt-2.5 w-full rounded-lg py-3 text-[15px] font-bold text-white" style={{ background: "#E4682C" }} disabled={!ready || busy}>
              {busy ? "Googleを開いています" : "掲載を残す"}
            </button>
            <p className="text-muted-foreground mt-2.5 text-[11px] leading-5">
              価格、写真、装備、販売店を読み取ります。写真はあとから選べます。
            </p>
            {notice && <p className="text-destructive mt-2 text-sm">{notice}</p>}
          </form>
        </div>
      </section>

      <section id="how" className="px-4 pt-7 sm:px-7" style={{ background: "#F6F5F3" }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-bold tracking-[0.08em]" style={{ color: "#9C3D12" }}>使い方</h2>
          <ol className="mt-4 grid gap-5 sm:grid-cols-3">
            {steps.map(([n, title, body]) => (
              <li key={n} className="pb-5">
                <p className="text-xs font-bold" style={{ color: "#E4682C" }}>{n}</p>
                <p className="mt-1 text-base font-bold">{title}</p>
                <p className="text-muted-foreground mt-1.5 text-sm leading-7">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-card px-4 pt-7 sm:px-7">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-lg font-bold">アカウントに残るもの</h2>
          <ul className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3">
            {kept.map(([title, body]) => (
              <li key={title} className="border-border border-t py-3.5 pr-4">
                <p className="text-sm font-bold">{title}</p>
                <p className="text-muted-foreground mt-1 text-xs">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-card px-4 pt-5 pb-7 sm:px-7">
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
          <div className="border-border mt-3 flex items-center gap-3 rounded-xl border p-3">
            <div className={`h-20 w-28 shrink-0 rounded-lg bg-[#efebe6] sm:h-24 sm:w-36 ${live ? "" : "grayscale"}`} />
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[11px] tracking-[0.12em]">BMW ALPINA</p>
              <p className="mt-0.5 truncate text-base font-bold">B5 リムジン</p>
              <p className="mt-1 text-xl font-bold">
                488<span className="ml-0.5 text-xs font-normal">万円</span>
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">2007(H19) ・ 6.2万km ・ アルピンホワイト</p>
            </div>
            <p className="hidden items-center pr-2 text-sm font-bold sm:flex" style={{ color: live ? "#157A3A" : "#6B6560" }}>
              <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: live ? "#157A3A" : "#B7B1AA" }} />
              {live ? "掲載中" : "掲載終了"}
            </p>
          </div>
        </div>
      </section>

      <section style={{ background: "#F6F5F3" }}>
        <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 py-6 sm:px-7 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-lg font-bold">LINEに送ると、その場で残る</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-7">
              カーセンサーの共有から「のこす」を選ぶと、アカウントに保存されます。返信は車のカードが1通だけ。番号や長いURLは返しません。
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Mark size={36} />
            <div className="border-border rounded-xl border bg-white px-3 py-2 text-xs leading-6">
              <p className="font-bold" style={{ color: "#157A3A" }}>保存しました</p>
              <p className="font-bold">B5 リムジン</p>
              <p>488万円 ・ 掲載中</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-5 sm:px-7">
          <Wordmark height={20} />
          <p className="text-xs text-white/70">カーセンサーの掲載を、自分のアカウントに残す。</p>
        </div>
      </footer>
    </div>
  );
}
