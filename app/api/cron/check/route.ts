import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { runDailyCheck } from "@/lib/daily-check";
import { sendDigests, siteOrigin } from "@/lib/notify";

export const maxDuration = 60;

const MAX_STEP = 8;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ message: "確認できません。" }, { status: 401 });
  }
  const step = Number(new URL(request.url).searchParams.get("step") || "0");
  const authorization = request.headers.get("authorization") || "";
  const origin = siteOrigin(new URL(request.url).origin);
  after(async () => {
    const result = await runDailyCheck();
    if (result.remaining > 0 && step < MAX_STEP) {
      // 続きは本番のURLに投げる。Vercel Cron が呼ぶのはデプロイごとのURL（保護つき）なので、
      // そのURLに投げると302でログイン画面へ飛ばされ、続きも通知も止まっていた
      const handedOff = await fetch(nextStepUrl(origin, step), { headers: { authorization }, cache: "no-store", redirect: "manual" })
        .then((response) => response.ok)
        .catch(() => false);
      if (handedOff) return;
    }
    // 確認が一通り終わったら（または続きを渡せなかったら）、値下げ・掲載終了をLINEで1日1通にまとめて送る
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    if (token) await sendDigests({ origin, token }).catch(() => undefined);
  });
  return Response.json({ accepted: true, step });
}

function nextStepUrl(origin: string, step: number): string {
  const next = new URL("/api/cron/check", origin);
  next.searchParams.set("step", String(step + 1));
  return next.toString();
}

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  const header = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
