import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import type { Metadata } from "next";
import { AccountProvider } from "@/components/account-provider";
import { MotionBoot } from "@/lib/motion/motion-boot";
import { AUTH_HINT_SCRIPT } from "@/lib/auth-hint";
import "./globals.css";
import "@/lib/motion/motion.css";

const SITE_URL = "https://fleet-maple-mto3zo3.vercel.app";
const SITE_DESCRIPTION = "カーセンサー・グーネット・カババ・ヤフオクの中古車掲載を、掲載終了の前に自分のアカウントへ残すメモ。値下げや掲載終了はLINEでお知らせします。";
const OG_IMAGE = { url: "/og.jpg", width: 1200, height: 630, alt: "のこす　気になった車を、消える前に残す。" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "のこす｜気になった中古車を、消える前に残す",
    template: "%s · のこす",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "のこす",
    url: "/",
    title: "のこす｜気になった中古車を、消える前に残す",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "のこす｜気になった中古車を、消える前に残す",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased" suppressHydrationWarning>
      <head>
      </head>
      <body className="bg-background text-foreground min-h-full">
        <MotionBoot />
        {/* ログインのクッキーがある人は、画面が動き出すまでトップを隠して「確認しています」を出す */}
        <script dangerouslySetInnerHTML={{ __html: AUTH_HINT_SCRIPT }} />
        <style>{`
          :root {
            --orange: #E4682C;
            --orange-ink: #9C3D12;
            --live: #008A00;
            --green: #E4682C;
            --background: #F7F7F7;
            --foreground: #111111;
            --card: #FFFFFF;
            --card-foreground: #111111;
            --primary: #9C3D12;
            --primary-foreground: #FFFFFF;
            --secondary: #F7F7F7;
            --secondary-foreground: #111111;
            --muted: #F2F2F2;
            --muted-foreground: #666666;
            --border: #E5E5E5;
            --input: #E5E5E5;
            --ring: #E4682C;
          }
        `}</style>
        <ClerkProvider
          localization={jaJP}
          signInUrl="/"
          signUpUrl="/"
          signInForceRedirectUrl="/"
          signUpForceRedirectUrl="/"
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
        >
          <AccountProvider>{children}</AccountProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
