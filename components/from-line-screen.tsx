"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveKept } from "@/lib/remote";
import { requestArchive, saveErrorMessage } from "@/lib/save-listing";
import { LineSteps } from "@/components/line-steps";

export function FromLineScreen({ url }: { url: string }) {
  const router = useRouter();
  // 0: URLを受け取った 1: 保存中 2: 保存できた（詳細へ移る）
  const [step, setStep] = useState(url ? 1 : 0);
  const [stopped, setStopped] = useState(!url);
  const [message, setMessage] = useState(
    url ? "掲載を読み取っています" : "車両ページのURLが見つかりません。LINEの「のこす」から、もう一度開いてください。",
  );

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    requestArchive(url)
      .then(async (result) => {
        if (cancelled) return;
        if (result.status === "ended") {
          setStopped(true);
          setMessage("この掲載はすでに終了していて、新しくは残せません。");
          return;
        }
        if (result.status === "error") {
          setStopped(true);
          setMessage(result.message);
          return;
        }
        await saveKept(result.listing, null);
        if (cancelled) return;
        setStep(2);
        setMessage("保存しました。開いています");
        router.replace(`/listings/${result.listing.id}`);
      })
      .catch((error) => {
        if (cancelled) return;
        setStopped(true);
        setMessage(saveErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [router, url]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-sm leading-7 text-muted-foreground">
      <div className="motion-crossfade mb-6">
        <LineSteps current={step} stopped={stopped} />
      </div>
      <p className="motion-crossfade" key={message} role="status">{message}</p>
    </main>
  );
}
