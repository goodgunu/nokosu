import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware((auth, request) => {
  void auth;
  const pathname = new URL(request.url).pathname;
  // 公開ページ（ログイン不要）: /privacy /terms
  if (pathname === "/privacy" || pathname === "/terms") return NextResponse.next();
  if (pathname.startsWith("/api/cron")) return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
