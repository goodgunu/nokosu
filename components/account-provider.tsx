"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { LoginOptions } from "@/components/login-options";
import { LandingPage } from "@/components/landing-page";
import { Wordmark } from "@/components/wordmark";
import { getSession } from "@/lib/remote";
import { AUTH_PENDING_CLASS, looksSignedIn } from "@/lib/auth-hint";

type AccountValue = {
  email: string;
  logout: () => Promise<void>;
};

const AccountContext = createContext<AccountValue | null>(null);

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [phase, setPhase] = useState<"loading" | "google" | "mismatch" | "ready">("loading");
  const [email, setEmail] = useState("");
  // ログインしていそうか（クッキーの目安）。サーバーと hydration 中は null＝わからない
  const signedInHint = useSyncExternalStore(subscribeNever, readSignedInHint, readNoHint);

  // 目安が読めたら、html の印（最初のスクリプトが付けたもの）を外し、以後は React の描画で出し分ける。
  // 描画の直後・画面に出る前に動くので、ログイン中の人にトップは見えない
  useLayoutEffect(() => {
    if (signedInHint !== null) document.documentElement.classList.remove(AUTH_PENDING_CLASS);
  }, [signedInHint]);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    getSession()
      .then((session) => {
        if (cancelled) return;
        if (session.mismatch && isSignedIn) {
          setPhase("mismatch");
          return;
        }
        if (session.email) {
          setEmail(session.email);
          setPhase("ready");
          return;
        }
        setPhase("google");
      })
      .catch(() => {
        if (!cancelled) setPhase("google");
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    if (isSignedIn) await signOut({ redirectUrl: "/" });
    setEmail("");
    setPhase("google");
  }

  const view = !isLoaded || phase === "loading" ? "loading" : phase;

  // ログインが要るのは、トップ・車の詳細・比較・LINE連携まわりだけ。
  // それ以外（規約・共有ページ・存在しないURLの404など）は、そのまま出す。
  if (!isGatedPath(pathname)) return children;

  if (view === "loading") {
    // ログイン前のトップは、確認を待たずにすぐ出す（ログイン中とわかったら一覧に切り替わる）。
    // ログインのクッキーがある人だけ、確認中の表示にする。
    // 画面が動き出す前は、最初のスクリプトが html に付けた印で、トップを隠して確認中を出す（CSS は globals.css）
    if (pathname === "/" && signedInHint !== true) {
      return <LandingWithPending />;
    }
    return <main className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">アカウントを確認しています</main>;
  }

  if (view === "mismatch") {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
        <h1 className="font-heading text-4xl">別のアカウントです</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          こののこすは、最初に接続したアカウントだけが開けます。最初のログイン方法で入り直してください。
        </p>
        <button
          type="button"
          className="mt-6 h-12 rounded-full border bg-card text-sm font-medium"
          onClick={() => void logout()}
        >
          別のアカウントで入る
        </button>
      </main>
    );
  }

  if (view !== "ready") {
    if (pathname.startsWith("/line/connect")) return <LoginScreen />;
    // 確認中と同じ形で返す（形が変わるとトップ全体を作り直して、重い処理と動きのやり直しが起きる）
    if (pathname === "/") return <LandingWithPending />;
    return <LoginRequired />;
  }

  return <AccountContext.Provider value={{ email, logout }}>{children}</AccountContext.Provider>;
}

// クッキーの変化は追わない（ログイン・ログアウトの後は /api/auth の結果で切り替わる）
function subscribeNever() {
  return () => {};
}
function readSignedInHint(): boolean | null {
  return looksSignedIn();
}
function readNoHint(): boolean | null {
  return null;
}

function isGatedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return ["/listings", "/compare", "/line", "/from-line"].some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

function currentPath(): string {
  return typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`;
}

// ログイン前のトップ。確認中の表示は、ログインのクッキーがある人に画面が動き出すまでだけ出る（globals.css）
function LandingWithPending() {
  return (
    <>
      <main className="auth-pending-only mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">アカウントを確認しています</main>
      <div className="auth-pending-hide">
        <LandingPage />
      </div>
    </>
  );
}

// トップ以外のログインが要るページを、未ログインで開いたとき
function LoginRequired() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFFFFF", color: "#1C1917" }}>
      <header style={{ background: "#9C3D12", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-7">
          <Link href="/" aria-label="のこす トップへ" className="inline-flex min-h-11 items-center">
            <Wordmark height={26} />
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-white">
            のこすとは
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 px-5 py-10 sm:py-14" data-page="login-required">
        <p className="text-xs font-bold tracking-[0.14em]" style={{ color: "#9C3D12" }}>ログインが必要です</p>
        <h1 className="mt-2 text-2xl leading-snug font-bold">ログインすると見られます</h1>
        <p className="mt-2 mb-6 text-sm leading-7" style={{ color: "#57534E" }}>
          このページは、車を保存した本人だけが開けます。保存したときと同じ方法でログインしてください。はじめての方は、そのまま登録できます。
        </p>
        <LoginOptions redirectUrl={currentPath()} />
        <Link
          href="/"
          className="mt-4 flex h-11 w-full items-center justify-center rounded-full text-sm font-bold"
          style={{ color: "#9C3D12" }}
        >
          トップへ戻る
        </Link>
      </main>
    </div>
  );
}

function LoginScreen() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <p className="font-heading text-sm tracking-[0.2em]" style={{ color: "#9C3D12" }}>のこす</p>
      <h1 className="font-heading mt-3 text-4xl leading-tight">LINEとつなぐ</h1>
      <p className="text-muted-foreground mt-3 mb-6 text-sm leading-7">
        最初の1回だけ、ログインしたアカウントとLINEの「のこす」をつなぎます。次からは、車を送るだけで保存されます。
      </p>
      <LoginOptions redirectUrl={currentPath()} />
    </main>
  );
}
