"use client";

import { useClerk, useSignIn, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { getSession } from "@/lib/remote";

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
  const [notice, setNotice] = useState("");

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

  if (pathname.startsWith("/sso-callback")) return children;

  if (view === "loading") {
    return <main className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">アカウントを確認しています</main>;
  }

  if (view === "mismatch") {
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
        <h1 className="font-heading text-4xl">別のGoogleアカウントです</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          こののこすは、最初に接続したGoogleアカウントだけが開けます。アカウントの選択画面で、そのアカウントを選んでください。
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
    return <GoogleSignIn notice={notice} onError={setNotice} />;
  }

  return <AccountContext.Provider value={{ email, logout }}>{children}</AccountContext.Provider>;
}

function GoogleSignIn({ notice, onError }: { notice: string; onError: (message: string) => void }) {
  const { signIn, fetchStatus } = useSignIn();
  const [busy, setBusy] = useState(false);
  const ready = fetchStatus !== "fetching";

  async function start() {
    if (!ready || busy) return;
    setBusy(true);
    onError("");
    try {
      const here = `${window.location.pathname}${window.location.search}`;
      const result = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: here.startsWith("/sso-callback") ? "/" : here,
        redirectCallbackUrl: "/sso-callback",
        oidcPrompt: "select_account",
      });
      if (result.error) {
        setBusy(false);
        onError(result.error.message || "Googleのログインを開始できませんでした。");
      }
    } catch (error) {
      setBusy(false);
      onError(error instanceof Error ? error.message : "Googleのログインを開始できませんでした。");
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <p className="font-heading text-stamp text-sm tracking-[0.2em]">のこす</p>
      <h1 className="font-heading mt-3 text-4xl leading-tight">Googleで開く</h1>
      <p className="text-muted-foreground mt-3 text-sm leading-7">
        いつも使っているGoogleアカウントを選ぶと、スマホでもパソコンでも同じ車が見えます。最初に選んだアカウントが、こののこすの持ち主です。
      </p>
      <button
        type="button"
        onClick={() => void start()}
        disabled={!ready || busy}
        className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-full border bg-card text-base font-medium shadow-sm disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? "Googleを開いています" : "Googleで続ける"}
      </button>
      {notice && <p className="text-destructive mt-3 text-sm leading-6">{notice}</p>}
    </main>
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
