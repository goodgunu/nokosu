"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type Links = { line: boolean; canLinkLine: boolean };

const BADGE = "inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[10px] font-bold";

// ログアウトの横に出す連携の状態。未連携ならボタン、連携済みならバッジ
export function ConnectBadges() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [links, setLinks] = useState<Links | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/links", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Links>) : null))
      .then((data) => {
        if (!cancelled && data) setLinks(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Xの連携は、Clerkでログインしているときだけ判定・連携できる
  const clerkUser = isLoaded && isSignedIn ? user : null;
  const xLinked = clerkUser?.externalAccounts?.some((a) => a.provider === "x" && a.verification?.status === "verified") ?? false;

  async function linkX() {
    if (!clerkUser || busy) return;
    setBusy(true);
    setErr("");
    try {
      // redirectUrl は絶対URLで渡す(相対だとClerkが解決できず失敗することがある)
      const account = await clerkUser.createExternalAccount({ strategy: "oauth_x", redirectUrl: window.location.href });
      const url = account.verification?.externalVerificationRedirectURL;
      if (url) window.location.assign(url.toString());
      else {
        setErr("Xの連携を開始できませんでした");
        setBusy(false);
      }
    } catch (e) {
      const msg = (e as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0];
      setErr(msg?.longMessage ?? msg?.message ?? "Xの連携を開始できませんでした");
      setBusy(false);
    }
  }

  return (
    <>
      {links?.line ? (
        <span className={BADGE} style={{ background: "#E7F6EC", color: "#05813A" }}>LINE連携済み</span>
      ) : links?.canLinkLine ? (
        <a
          href={`/api/auth/line-login?link=1&next=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`}
          className={`${BADGE} text-white`}
          style={{ background: "#06C755" }}
        >
          LINE連携
        </a>
      ) : null}
      {clerkUser &&
        (xLinked ? (
          <span className={BADGE} style={{ background: "#FFFFFF", color: "#000000" }}>X連携済み</span>
        ) : (
          <button type="button" disabled={busy} onClick={() => void linkX()} className={`${BADGE} text-white disabled:opacity-60`} style={{ background: "#000000" }}>
            X連携
          </button>
        ))}
      {err ? <span role="alert" className="max-w-[10rem] text-[10px] font-bold text-red-600">{err}</span> : null}
    </>
  );
}
