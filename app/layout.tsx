import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import type { Metadata } from "next";
import { AccountProvider } from "@/components/account-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "のこす",
    template: "%s · のこす",
  },
  description: "カーセンサーの中古車掲載を、売約や掲載終了の前に自分のアカウントへ残すメモ。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Japanese faces are loaded in full. next/font only subsets Latin for these families. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground min-h-full">
        <style>{`
          :root {
            --orange: #E4682C;
            --orange-ink: #9C3D12;
            --live: #157A3A;
            --background: #F6F5F3;
            --foreground: #1C1917;
            --card: #FFFFFF;
            --card-foreground: #1C1917;
            --primary: #E4682C;
            --primary-foreground: #FFFFFF;
            --secondary: #F6F5F3;
            --secondary-foreground: #1C1917;
            --muted: #F6F5F3;
            --muted-foreground: #6B6560;
            --border: #E7E2DC;
            --input: #E7E2DC;
            --ring: #E4682C;
          }
        `}</style>
        <ClerkProvider localization={jaJP}>
          <AccountProvider>{children}</AccountProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
