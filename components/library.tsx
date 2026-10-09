"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveImage } from "@/components/archive-image";
import { useCovers } from "@/components/use-photos";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildBackup, downloadBlob, importBackup } from "@/lib/backup";
import { readCompare, writeCompare } from "@/lib/compare";
import { listListings } from "@/lib/db";
import { displayName, formatDay, highlightChips, yearNumber } from "@/lib/format";
import { markEnded, requestArchive, saveParsedListing } from "@/lib/save-listing";
import { WATCH_STATUSES, watchLabel, type ArchiveRecord, type WatchStatus } from "@/lib/types";

type Filter = "all" | WatchStatus | "ended";
type Sort = "new" | "price" | "year";

export function Library() {
  const [listings, setListings] = useState<ArchiveRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    setListings(await listListings());
    setReady(true);
  }

  useEffect(() => {
    let cancelled = false;
    listListings().then((rows) => {
      if (cancelled) return;
      setListings(rows);
      setCompareIds(readCompare());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const covers = useCovers(listings.map((listing) => listing.id));

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = listings.filter((listing) => {
      if (filter === "ended" && listing.availability !== "ended") return false;
      if (filter !== "all" && filter !== "ended" && listing.watchStatus !== filter) return false;
      if (!needle) return true;
      const haystack = [listing.title, listing.maker, listing.model, listing.shopName, listing.memo, listing.color, listing.totalPrice]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
    const sorted = [...filtered];
    if (sort === "price") {
      sorted.sort((a, b) => (a.priceYen ?? Number.MAX_SAFE_INTEGER) - (b.priceYen ?? Number.MAX_SAFE_INTEGER));
    } else if (sort === "year") {
      sorted.sort((a, b) => (yearNumber(b) ?? 0) - (yearNumber(a) ?? 0));
    } else {
      sorted.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
    }
    return sorted;
  }, [listings, query, filter, sort]);

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 3);
      if (!current.includes(id) && current.length >= 3) {
        setNotice("比べられるのは3台までです。");
        setNoticeError(true);
        return current;
      }
      writeCompare(next);
      return next;
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const target = url.trim();
    if (!target || busy) return;
    setNotice("");
    setNoticeError(false);
    setBusy("掲載を読み取っています");
    try {
      const result = await requestArchive(target);
      if (result.status === "ended") {
        const existing = await markEnded(result.id);
        if (existing) {
          await reload();
          setNotice("この掲載は終了していました。以前保存した内容に、終了の印を付けました。");
        } else {
          setNoticeError(true);
          setNotice("この掲載はすでに終了していて、価格も写真も取れません。載っているうちに保存してください。");
        }
        return;
      }
      if (result.status === "error") {
        setNoticeError(true);
        setNotice(result.message);
        return;
      }
      const saved = await saveParsedListing(result.listing, (done, total) => {
        setBusy(total ? `写真を保存しています ${done}/${total}` : "保存しています");
      });
      setUrl("");
      await reload();
      const photoNote = saved.failedPhotos ? `写真${saved.failedPhotos}枚は取れませんでした。` : `${saved.record.photoCount}枚の写真も残しました。`;
      setNotice(saved.updated ? `同じ車両を更新しました。${photoNote}` : `保存しました。${photoNote}`);
    } catch {
      setNoticeError(true);
      setNotice("保存できませんでした。通信状況を見て、もう一度試してください。");
    } finally {
      setBusy("");
    }
  }

  async function exportAll() {
    if (!listings.length) {
      setNoticeError(true);
      setNotice("書き出す保存がまだありません。");
      return;
    }
    const blob = await buildBackup(listings);
    downloadBlob(blob, `nokosu-backup.zip`);
    setNoticeError(false);
    setNotice(`${listings.length}台を書き出しました。このファイルを別のブラウザで読み込めます。`);
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const count = await importBackup(file);
      await reload();
      setNoticeError(false);
      setNotice(`${count}台を読み込みました。`);
    } catch (error) {
      setNoticeError(true);
      setNotice(error instanceof Error ? error.message : "読み込めませんでした。");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-2xl border bg-card px-4 py-5 sm:px-6">
          <h1 className="font-heading text-3xl leading-tight sm:text-4xl">気になった車を、消える前に残す</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-7">
            カーセンサーの詳細ページは、売約や掲載期間が終わると開けなくなります。URLを貼ると、価格、スペック、装備、販売店、写真をこのブラウザに控えとして残します。
          </p>
          <form onSubmit={save} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="carsensor-url">
              カーセンサーの詳細ページURL
            </label>
            <Input
              id="carsensor-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.carsensor.net/usedcar/detail/AU…/index.html"
              className="h-11 bg-background text-base"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <Button type="submit" className="h-11 px-5" disabled={Boolean(busy)}>
              {busy || "この掲載を保存"}
            </Button>
          </form>
          {notice && (
            <p className={`mt-3 text-sm leading-6 ${noticeError ? "text-destructive" : ""}`}>{notice}</p>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
              すべて
            </FilterButton>
            {WATCH_STATUSES.map((status) => (
              <FilterButton key={status.id} active={filter === status.id} onClick={() => setFilter(status.id)}>
                {status.label}
              </FilterButton>
            ))}
            <FilterButton active={filter === "ended"} onClick={() => setFilter("ended")}>
              掲載終了
            </FilterButton>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="車名、店、メモ"
              className="h-9 w-full bg-card sm:w-48"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="border-input h-9 rounded-lg border bg-card px-2 text-sm"
              aria-label="並び順"
            >
              <option value="new">保存が新しい順</option>
              <option value="price">支払総額が安い順</option>
              <option value="year">年式が新しい順</option>
            </select>
            <Button variant="outline" onClick={() => void exportAll()}>
              書き出す
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              読み込む
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => void onImport(event.target.files?.[0])}
            />
          </div>
        </div>

        {!ready ? (
          <p className="text-muted-foreground mt-10 text-sm">保存を読み込んでいます</p>
        ) : listings.length === 0 ? (
          <EmptyLibrary />
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground mt-10 text-sm">条件に合う車はありません。</p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((listing) => (
              <li key={listing.id} className="overflow-hidden rounded-2xl border bg-card">
                <Link href={`/listings/${listing.id}`} className="block">
                  <div className="bg-muted aspect-[4/3]">
                    {covers[listing.id] ? (
                      <ArchiveImage src={covers[listing.id]} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="text-muted-foreground grid size-full place-items-center text-sm">写真なし</div>
                    )}
                  </div>
                  <div className="px-4 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{watchLabel(listing.watchStatus)}</Badge>
                      {listing.availability === "ended" && <Badge variant="destructive">掲載終了</Badge>}
                    </div>
                    <h2 className="font-heading mt-2 text-2xl leading-tight">{displayName(listing)}</h2>
                    <p className="mt-2 text-lg">{listing.totalPrice || listing.basePrice || "価格未記載"}</p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-6">
                      {highlightChips(listing.highlights)
                        .map((item) => item.value)
                        .join(" · ") || listing.shopName}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(listing.id)}
                      onChange={() => toggleCompare(listing.id)}
                    />
                    比べる
                  </label>
                  <span className="text-muted-foreground text-xs">{formatDay(listing.savedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="text-muted-foreground mt-12 border-t pt-5 text-xs leading-6">
          のこすはカーセンサーとは関係のない個人用のメモです。掲載の文章と写真の権利は販売店とカーセンサーにあります。保存データはこのブラウザの中だけにあり、消すと戻せないので、必要なときは書き出してください。
        </footer>
      </main>

      {compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm">{compareIds.length}台を選択中</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  writeCompare([]);
                  setCompareIds([]);
                }}
              >
                解除
              </Button>
              {compareIds.length >= 2 ? (
                <Button render={<Link href="/compare" />}>並べて見る</Button>
              ) : (
                <Button disabled>並べて見る</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick} className="shrink-0">
      {children}
    </Button>
  );
}

function EmptyLibrary() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed bg-card/60 px-5 py-10">
      <p className="font-heading text-stamp text-sm tracking-[0.2em]">掲載終了の前に</p>
      <h2 className="font-heading mt-2 text-3xl">まだ一台も残っていません</h2>
      <ol className="text-muted-foreground mt-4 max-w-xl list-decimal space-y-2 pl-5 text-sm leading-7">
        <li>カーセンサーで気になる車の詳細ページを開く。</li>
        <li>アドレスバーのURLをコピーして、上の欄に貼る。</li>
        <li>保存したあとは、元のページが消えてもここから見返せます。</li>
      </ol>
    </div>
  );
}
