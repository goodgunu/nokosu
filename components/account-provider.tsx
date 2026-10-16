"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { LoginOptions } from "@/components/login-options";
import { LandingPage } from "@/components/landing-page";
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

  if (pathname.startsWith("/sso-callback") || pathname === "/privacy" || pathname === "/terms") return children;

  if (view === "loading") {
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
    return <LandingPage />;
  }

  return <AccountContext.Provider value={{ email, logout }}>{children}</AccountContext.Provider>;
}

function LoginScreen() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <p className="font-heading text-sm tracking-[0.2em]" style={{ color: "#E4682C" }}>のこす</p>
      <h1 className="font-heading mt-3 text-4xl leading-tight">LINEとつなぐ</h1>
      <p className="text-muted-foreground mt-3 mb-6 text-sm leading-7">
        最初の1回だけ、ログインしたアカウントとLINEの「のこす」をつなぎます。次からは、車を送るだけで保存されます。
      </p>
      <LoginOptions redirectUrl={typeof window === "undefined" ? "/" : `${window.location.pathname}${window.location.search}`} />
    </main>
  );
}
