"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSession, logoutAccount, submitAccount } from "@/lib/remote";

type AccountValue = {
  email: string;
  logout: () => Promise<void>;
};

const AccountContext = createContext<AccountValue | null>(null);

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "signup" | "login" | "ready">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((session) => {
        if (cancelled) return;
        if (session.email) {
          setEmail(session.email);
          setPhase("ready");
          return;
        }
        setPhase(session.hasOwner ? "login" : "signup");
      })
      .catch(() => {
        if (!cancelled) setPhase("login");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await logoutAccount();
    setEmail("");
    setPhase("login");
  }

  if (phase === "loading") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-sm text-muted-foreground">アカウントを確認しています</main>
    );
  }

  if (phase !== "ready") {
    return (
      <AuthScreen
        mode={phase}
        onDone={(nextEmail) => {
          setEmail(nextEmail);
          setPhase("ready");
        }}
      />
    );
  }

  return <AccountContext.Provider value={{ email, logout }}>{children}</AccountContext.Provider>;
}

function AuthScreen({ mode, onDone }: { mode: "signup" | "login"; onDone: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (mode === "signup" && password !== confirm) {
      setMessage("パスワードが一致しません。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await submitAccount(mode === "signup" ? "register" : "login", email, password);
      onDone(result.email);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ログインできませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <p className="font-heading text-stamp text-sm tracking-[0.2em]">のこす</p>
      <h1 className="font-heading mt-3 text-4xl leading-tight">
        {mode === "signup" ? "最初のアカウントを作る" : "ログイン"}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm leading-7">
        {mode === "signup"
          ? "車の文章と、選んだ写真は、このアカウントに残ります。同じメールアドレスで開けば、スマホでもパソコンでも同じ一覧が見えます。最初に作った人が、このサイトの持ち主です。"
          : "保存した車はアカウントに残っています。このブラウザ以外から見るときも、同じメールアドレスで入ってください。"}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block text-sm">
          メールアドレス
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-11 bg-card text-base"
            required
          />
        </label>
        <label className="block text-sm">
          パスワード
          <Input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 h-11 bg-card text-base"
            minLength={8}
            required
          />
        </label>
        {mode === "signup" && (
          <label className="block text-sm">
            パスワードをもう一度
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="mt-1 h-11 bg-card text-base"
              minLength={8}
              required
            />
          </label>
        )}
        {message && <p className="text-destructive text-sm leading-6">{message}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? "確認しています" : mode === "signup" ? "アカウントを作る" : "ログイン"}
        </Button>
      </form>
    </main>
  );
}
