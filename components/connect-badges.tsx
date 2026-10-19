"use client";

import { useEffect, useState } from "react";
import { LINE_ALREADY_USED_MESSAGE, LINE_UNAVAILABLE_MESSAGE } from "@/lib/line-link-messages";

type Links = { line: boolean; canLinkLine: boolean };

export const HEADER_PILL = "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold leading-none";

async function fetchLinks(): Promise<Links | null> {
  const r = await fetch("/api/auth/links", { cache: "no-store" });
  return r.ok ? ((await r.json()) as Links) : null;
}

// ログアウトの横に出すLINE連携の状態。未連携ならボタン、連携済みならバッジ
// （Xはログイン方法としてだけ使い、ログイン後の連携ボタン・バッジは出さない）
export function ConnectBadges() {
  const [links, setLinks] = useState<Links | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchLinks()
        .then((data) => {
          if (!cancelled && data) setLinks(data);
        })
        .catch(() => undefined);
    void load();
    // LINE連携の戻り(?line=conflict 等)。AuthNoticeでも出すが、バッジ横にも赤字を出す
    const flag = new URL(window.location.href).searchParams.get("line");
    if (flag === "conflict") setErr(LINE_ALREADY_USED_MESSAGE);
    else if (flag === "unavailable") setErr(LINE_UNAVAILABLE_MESSAGE);
    window.addEventListener("nokosu-line-linked", load);
    return () => {
      cancelled = true;
      window.removeEventListener("nokosu-line-linked", load);
    };
  }, []);

  return (
    <>
      {links?.line ? (
        <span className={HEADER_PILL} style={{ background: "#E7F6EC", color: "#05813A" }}>
          LINE連携済み
        </span>
      ) : links?.canLinkLine ? (
        <a
          href={`/api/auth/line-login?link=1&next=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`}
          className={`${HEADER_PILL} text-white`}
          style={{ background: "#06C755" }}
        >
          LINE連携
        </a>
      ) : null}
      {err ? (
        <span role="alert" className="max-w-[14rem] text-[10px] font-bold leading-snug text-red-600 sm:max-w-xs">
          {err}
        </span>
      ) : null}
    </>
  );
}
