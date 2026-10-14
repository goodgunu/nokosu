import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { runDailyCheck } from "@/lib/daily-check";

export const maxDuration = 60;

const MAX_STEP = 8;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return Response.json({ message: "確認できません。" }, { status: 401 });
  }
  const step = Number(new URL(request.url).searchParams.get("step") || "0");
  const authorization = request.headers.get("authorization") || "";
  after(async () => {
    const result = await runDailyCheck();
    if (result.remaining > 0 && step < MAX_STEP) {
      const next = new URL(request.url);
      next.searchParams.set("step", String(step + 1));
      await fetch(next, { headers: { authorization }, cache: "no-store" }).catch(() => undefined);
    }
  });
  return Response.json({ accepted: true, step });
}

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  const header = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (!secret || header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}
