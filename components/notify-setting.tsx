"use client";

import { useEffect, useState } from "react";

type State = { available: boolean; enabled: boolean };

// 一覧の下に出す「LINE通知」の切り替え
export function NotifySettingCard() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notify", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<State>) : null))
      .then((data) => {
        if (!cancelled && data) setState(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (!state || busy) return;
    const enabled = !state.enabled;
    setBusy(true);
    setError("");
    setState({ ...state, enabled });
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error();
      setState((await response.json()) as State);
    } catch {
      setState({ ...state });
      setError("切り替えられませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm" style={{ borderColor: "#F0C8AE" }} data-section="notify">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">LINE通知</h2>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {state.available
              ? "毎朝の確認で、値下げや掲載終了（売約）が見つかったら、LINEでお知らせします。1日1通にまとめます。"
              : "LINEとつなぐと、値下げや掲載終了（売約）をLINEでお知らせできます。上の「LINE連携」からつないでください。"}
          </p>
        </div>
        {state.available && (
          <button
            type="button"
            role="switch"
            aria-checked={state.enabled}
            aria-label="LINE通知"
            disabled={busy}
            onClick={() => void toggle()}
            className="relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60"
            style={{ background: state.enabled ? "#E7692F" : "#D6D3D1" }}
          >
            <span
              className="absolute top-0.5 size-6 rounded-full bg-white shadow transition-all"
              style={{ left: state.enabled ? "1.375rem" : "0.125rem" }}
            />
          </button>
        )}
      </div>
      {state.available && (
        <p className="mt-2 text-xs font-bold" style={{ color: state.enabled ? "#E7692F" : "#6B6560" }}>
          {state.enabled ? "オン" : "オフ"}
        </p>
      )}
      {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
    </section>
  );
}
