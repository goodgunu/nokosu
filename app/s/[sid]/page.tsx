import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { getShare } from "@/lib/store";

type Props = { params: Promise<{ sid: string }> };

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function statusText(availability: string): string {
  return availability === "ended" ? "掲載終了" : availability === "live" ? "掲載中" : "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sid } = await params;
  const share = await getShare(sid);
  if (!share) return { title: "共有ページが見つかりません", robots: { index: false, follow: false } };
  const { listing } = share;
  const base = await origin();
  const title = [listing.name, listing.year].filter(Boolean).join(" ");
  const price = listing.price ? `${listing.priceLabel} ${listing.price}` : "";
  const description = [price, "のこすで保存した中古車です。写真つきで見られます。"].filter(Boolean).join("。");
  const image = listing.photoCount > 0 ? `${base}/api/share/${share.id}/photos/${listing.coverIndex}` : undefined;
  return {
    metadataBase: new URL(base),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: price ? `${title} ${price}` : title,
      description,
      url: `${base}/s/${share.id}`,
      siteName: "のこす",
      type: "article",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: price ? `${title} ${price}` : title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function SharePage({ params }: Props) {
  const { sid } = await params;
  const share = await getShare(sid);
  if (!share) notFound();
  const { listing } = share;
  const indexes = Array.from({ length: listing.photoCount }, (_, i) => i);
  const status = statusText(listing.availability);
  const title = [listing.name, listing.year].filter(Boolean).join(" ");

  return (
    <div className="min-h-full bg-background">
      <header style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label="のこす"><Wordmark height={24} /></Link>
          <Link href="/" className="text-xs font-bold">のこすとは</Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-4 pb-10">
        {indexes.length > 0 && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/share/${share.id}/photos/${indexes[0]}`} alt={title} className="aspect-[16/10] w-full rounded-2xl border bg-muted object-cover" />
            {indexes.length > 1 && (
              <div className="grid grid-cols-2 gap-2">
                {indexes.slice(1).map((i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={`/api/share/${share.id}/photos/${i}`} alt="" loading="lazy" className="aspect-[16/10] w-full rounded-xl border bg-muted object-cover" />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
          <h1 className="text-[19px] leading-snug font-bold break-words">{listing.name}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {[listing.year, status].filter(Boolean).join(" ・ ")}
          </p>
          {listing.price && (
            <p className="mt-2 flex items-baseline gap-1 leading-none">
              <span className="text-muted-foreground text-[11px] font-bold">{listing.priceLabel}</span>
              <span className="text-[26px] font-extrabold tabular-nums" style={{ color: "#E4682C" }}>{listing.price.replace(/万円$/, "")}</span>
              {/万円$/.test(listing.price) && <span className="text-sm font-bold">万円</span>}
            </p>
          )}
        </div>

        {listing.equipment.length > 0 && (
          <details className="mt-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <summary className="cursor-pointer text-sm font-bold">装備を見る（{listing.equipment.length}）</summary>
            <p className="text-muted-foreground mt-2 text-sm leading-7">{listing.equipment.join(" ・ ")}</p>
          </details>
        )}

        <section className="mt-6 rounded-2xl p-5 text-center" style={{ background: "#FFF6EF" }}>
          <p className="text-sm font-bold">気になる車を、消える前に残す</p>
          <p className="text-muted-foreground mt-1 text-xs leading-6">
            中古車の掲載は、売約や掲載終了で見られなくなります。のこすなら、写真も価格も自分のアカウントに残せます。
          </p>
          <Link
            href="/"
            className="mt-3 inline-block rounded-full px-6 py-3 text-sm font-bold text-white"
            style={{ background: "#E4682C" }}
          >
            のこすで保存する
          </Link>
        </section>

        <p className="text-muted-foreground mt-6 text-center text-[11px] leading-5">
          {/^https?:\/\//.test(listing.sourceUrl) && (
            <>
              元の掲載ページ:{" "}
              <a href={listing.sourceUrl} target="_blank" rel="noreferrer nofollow" className="inline-flex items-center gap-0.5 underline underline-offset-2">
                開く<ExternalLink className="size-3" />
              </a>
              <br />
            </>
          )}
          掲載の文章と写真の権利は、販売店・出品者と各サイトにあります。
          <br />
          <Link href="/privacy" className="underline underline-offset-2">プライバシーポリシー</Link>
        </p>
      </main>
    </div>
  );
}
