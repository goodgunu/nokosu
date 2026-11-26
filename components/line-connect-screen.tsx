"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LineSteps } from "@/components/line-steps";

export function LineConnectScreen({ code }: { code: string }) {
  const router = useRouter();
  // つないで保存している間は「保存」、保存できたら「あとで見返す」へ進む
  const [step, setStep] = useState(code ? 1 : 0);
  const [stopped, setStopped] = useState(!code);
  const [message, setMessage] = useState(
    code ? "アカウントをつないで、車を保存しています" : "このリンクは使えません。LINEの「のこす」から、もう一度送ってください。",
  );

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch("/api/line/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as { href?: string; message?: string };
        if (cancelled) return;
        if (!response.ok) {
          setStopped(true);
          setMessage(data.message || "つなげませんでした。LINEの「のこす」から、もう一度送ってください。");
          return;
        }
        if (data.href) {
          setStep(2);
          router.replace(data.href);
          return;
        }
        setStopped(true);
        setMessage(data.message || "保存できませんでした。");
      })
      .catch(() => {
        if (cancelled) return;
        setStopped(true);
        setMessage("つなげませんでした。通信を確認して、もう一度開いてください。");
      });
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-sm leading-7 text-muted-foreground">
      <div className="motion-crossfade mb-6">
        <LineSteps current={step} stopped={stopped} />
      </div>
      <p className="motion-crossfade" key={message} role="status">{message}</p>
    </main>
  );
}
