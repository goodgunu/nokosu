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
      </head>
      <body className="bg-background text-foreground min-h-full">
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
            --primary: #E4682C;
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
        <ClerkProvider localization={jaJP}>
          <AccountProvider>{children}</AccountProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
