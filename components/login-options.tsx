"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import type { OAuthStrategy } from "@clerk/shared/types";
import Image from "next/image";
import { useEffect, useState } from "react";

type OAuthProvider = {
  id: string;
  label: string;
  strategy: OAuthStrategy;
  icon: React.ReactNode;
  dark?: boolean;
  prompt?: "select_account";
};

// プロバイダーを足すときは、この配列に1件追加する（例: Yahoo! は strategy: "oauth_yahoo"）。
export const OAUTH_PROVIDERS: OAuthProvider[] = [
  { id: "google", label: "Googleで続ける", strategy: "oauth_google", icon: <GoogleMark />, prompt: "select_account" },
  { id: "x", label: "Xで続ける", strategy: "oauth_x", icon: <XMark />, dark: true },
];

const BUTTON = "flex h-12 w-full items-center justify-center gap-3 rounded-full border bg-card text-base font-medium shadow-sm disabled:opacity-60";
const ORANGE = "#E4682C";

export function LoginOptions({ redirectUrl = "/", onBeforeStart }: { redirectUrl?: string; onBeforeStart?: () => void }) {
  const { signIn, fetchStatus } = useSignIn();
  const { signUp } = useSignUp();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"choose" | "email" | "code">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newUser, setNewUser] = useState(false);
  const ready = fetchStatus !== "fetching" && !busy;

  // 外部ログインから「戻る」で戻ったとき（bfcache）や、遷移が進まないときに、ボタンを押せる状態へ戻す。
  useEffect(() => {
    const reset = () => setBusy("");
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function oauth(provider: OAuthProvider) {
    if (!ready) return;
    setBusy(provider.id);
    setNotice("");
    onBeforeStart?.();
    try {
      const result = await signIn.sso({
        strategy: provider.strategy,
        redirectUrl: redirectUrl.startsWith("/sso-callback") ? "/" : redirectUrl,
        redirectCallbackUrl: "/sso-callback",
        ...(provider.prompt ? { oidcPrompt: provider.prompt } : {}),
      });
      if (result.error) fail(result.error.message || "ログインを開始できませんでした。");
      else window.setTimeout(() => setBusy(""), 15000);
    } catch (error) {
      fail(error instanceof Error ? error.message : "ログインを開始できませんでした。");
    }
  }

  function fail(message: string) {
    setBusy("");
    setNotice(message);
  }

  async function sendCode() {
    const address = email.trim();
    if (!ready || !address) return;
    setBusy("email");
    setNotice("");
    onBeforeStart?.();
    try {
      let notFound = false;
      let signInError: unknown = null;
      try {
        const created = await signIn.create({ identifier: address });
        signInError = created.error;
      } catch (error) {
        signInError = error;
      }
      if (signInError) notFound = isNotFound(signInError);
      if (!signInError) {
        const sent = await signIn.emailCode.sendCode();
        if (sent.error) return fail(sent.error.message || "コードを送れませんでした。");
        setNewUser(false);
      } else if (notFound) {
        // 未登録のアドレスは、そのまま新規登録（メールコードで本人確認）する。
        const made = await signUp.create({ emailAddress: address, password: randomPassword() });
        if (made.error) return fail(made.error.message || "コードを送れませんでした。");
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) return fail(sent.error.message || "コードを送れませんでした。");
        setNewUser(true);
      } else {
        return fail(errorText(signInError) || "コードを送れませんでした。");
      }
      setBusy("");
      setCode("");
      setMode("code");
    } catch (error) {
      fail(error instanceof Error ? error.message : "コードを送れませんでした。");
    }
  }

  async function verify() {
    const value = code.trim();
    if (!ready || !value) return;
    setBusy("email");
    setNotice("");
    const navigate = async () => {
      window.location.assign(redirectUrl.startsWith("/sso-callback") ? "/" : redirectUrl);
    };
    try {
      if (newUser) {
        const result = await signUp.verifications.verifyEmailCode({ code: value });
        if (result.error) return fail(result.error.message || "コードが違います。");
        const done = await signUp.finalize({ navigate });
        if (done.error) return fail(done.error.message || "ログインを完了できませんでした。");
      } else {
        const result = await signIn.emailCode.verifyCode({ code: value });
        if (result.error) return fail(result.error.message || "コードが違います。");
        const done = await signIn.finalize({ navigate });
        if (done.error) return fail(done.error.message || "ログインを完了できませんでした。");
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : "ログインを完了できませんでした。");
    }
  }

  const next = encodeURIComponent(redirectUrl.startsWith("/sso-callback") ? "/" : redirectUrl);

  function providerButton(id: string) {
    const provider = OAUTH_PROVIDERS.find((item) => item.id === id);
    if (!provider) return null;
    return (
      <button
        key={provider.id}
        type="button"
        className={provider.dark ? "flex h-12 w-full items-center justify-center gap-3 rounded-full border border-black text-base font-medium text-white shadow-sm disabled:opacity-60" : BUTTON}
        style={provider.dark ? { background: "#000000" } : undefined}
        disabled={!ready}
        onClick={() => void oauth(provider)}
      >
        {provider.icon}
        {provider.label}
      </button>
    );
  }

  return (
    <div className="w-full">
      {mode === "choose" && (
        <div className="space-y-2.5">
          {/* 並び順: LINE、X、Google、Yahoo! JAPAN、メール */}
          <a
            href={`${"/api/auth/line-login"}?next=${next}`}
            onClick={() => onBeforeStart?.()}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full text-base font-bold text-white shadow-sm"
            style={{ background: "#06C755" }}
          >
            <LineMark />
            LINEで続ける
          </a>
          {providerButton("x")}
          {providerButton("google")}
          <a
            href={`${"/api/auth/yahoo-login"}?next=${next}`}
            onClick={() => onBeforeStart?.()}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full text-base font-bold text-white shadow-sm"
            style={{ background: "#FF0033" }}
          >
            <YahooMark />
            Yahoo! JAPANで続ける
          </a>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-full text-base font-bold text-white shadow-sm disabled:opacity-60"
            style={{ background: ORANGE }}
            disabled={!ready}
            onClick={() => setMode("email")}
          >
            <MailMark />
            メールで続ける
          </button>
        </div>
      )}

      {mode === "email" && (
        <form
          className="space-y-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
        >
          <label htmlFor="login-email" className="text-muted-foreground text-xs">
            メールアドレス（6桁のコードを送ります）
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="border-border w-full rounded-lg border px-3 py-3 text-sm"
          />
          <button type="submit" className="h-12 w-full rounded-full text-base font-bold text-white disabled:opacity-60" style={{ background: ORANGE }} disabled={!ready || !email.trim()}>
            {busy === "email" ? "送っています" : "コードを送る"}
          </button>
          <button type="button" className="text-muted-foreground w-full text-xs" onClick={() => { setMode("choose"); setNotice(""); }}>
            ほかの方法にする
          </button>
        </form>
      )}

      {mode === "code" && (
        <form
          className="space-y-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
        >
          <label htmlFor="login-code" className="text-muted-foreground text-xs">
            {email.trim()} に届いたコード
          </label>
          <input
            id="login-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="123456"
            className="border-border w-full rounded-lg border px-3 py-3 text-center text-lg tracking-[0.3em]"
          />
          <button type="submit" className="h-12 w-full rounded-full text-base font-bold text-white disabled:opacity-60" style={{ background: ORANGE }} disabled={!ready || !code.trim()}>
            {busy === "email" ? "確認しています" : "はじめる"}
          </button>
          <button type="button" className="text-muted-foreground w-full text-xs" onClick={() => { setMode("email"); setNotice(""); }}>
            メールアドレスを直す
          </button>
        </form>
      )}

      {notice && <p className="text-destructive mt-3 text-sm leading-6">{notice}</p>}
    </div>
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "";
}

function isNotFound(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code || "";
  return code === "form_identifier_not_found" || /couldn.?t find your account/i.test(errorText(error));
}

// パスワードは使わない（コードで入る）。Clerk側でパスワードが必須の設定でも登録できるよう、本人も知らないランダム値を入れる。
function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Nk-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// 背景なしの白ロゴ（文字部分は透過）。ボタンの背景色がそのまま透けて見える。
function LineMark() {
  return <Image src="/icon-line.png" alt="" width={26} height={24} />;
}

function YahooMark() {
  return <Image src="/icon-yahoo.png" alt="" width={32} height={17} />;
}

function MailMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function XMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.2 22H2l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
