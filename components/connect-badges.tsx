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
    try {
      const account = await clerkUser.createExternalAccount({ strategy: "oauth_x", redirectUrl: window.location.pathname });
      const url = account.verification?.externalVerificationRedirectURL;
      if (url) window.location.assign(url.toString());
      else setBusy(false);
    } catch {
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
    </>
  );
}
