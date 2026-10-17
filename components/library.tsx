"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SOURCE_BADGE_CLASS, SourceBadge } from "@/components/source-badge";
import { SpecChips, priceNumber, showsMan } from "@/components/spec-chip";
import { ArchiveImage } from "@/components/archive-image";
import { PhotoPicker } from "@/components/photo-picker";
import { LineAddCard } from "@/components/line-add-link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildBackup, downloadBlob, readBackup } from "@/lib/backup";
import { readCompare, writeCompare } from "@/lib/compare";
import { deleteListing, getPhotos, listListings, storedPhotoBlob } from "@/lib/db";
import { displayName, vehicleHeading } from "@/lib/format";
import { cardInfo } from "@/lib/card-info";
import { SORT_OPTIONS, sortLabel, sortListings, type SortState } from "@/lib/library-sort";
import { filterListings, sourceCounts, type SourceFilter } from "@/lib/library-filter";
import { SOURCE_LABEL, type Source } from "@/lib/sites";
import { priceChange } from "@/lib/price-history";
import { photoSrc, fetchListings, loadRemotePhotos, patchListing, saveKept, uploadSavedCar } from "@/lib/remote";
import { requestArchive, saveErrorMessage } from "@/lib/save-listing";
import { watchLabel, type ArchiveRecord, type ParsedListing } from "@/lib/types";


export function Library({ lineReady = false }: { lineReady?: boolean }) {
  const [listings, setListings] = useState<ArchiveRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    const pending = sessionStorage.getItem("nokosu-pending-url") || "";
    if (pending) sessionStorage.removeItem("nokosu-pending-url");
    return pending;
  });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<SortState>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<ParsedListing | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function reload() {
    setListings(await fetchListings());
    setReady(true);
  }

  useEffect(() => {
    let cancelled = false;
    fetchListings()
      .then(async (rows) => {
        if (cancelled) return;
        setListings(rows);
        setCompareIds(readCompare());
        const local = await listListings().catch(() => []);
        const known = new Set(rows.map((row) => row.id));
        if (!cancelled) setLocalCount(local.filter((row) => !known.has(row.id)).length);
        setReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setReady(true);
        setNoticeError(true);
        setNotice(saveErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    return sortListings(filterListings(listings, "all", sourceFilter, query), sort);
  }, [listings, query, sourceFilter, sort]);
  const counts = useMemo(() => sourceCounts(listings, "all", query), [listings, query]);

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
        const existing = listings.find((item) => item.id === result.id);
        if (existing) {
          await patchListing(existing.id, {
            availability: "ended",
            lastCheckedAt: new Date().toISOString(),
          });
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
      setDraft(result.listing);
      setNotice("写真を選んでから残してください。選ばなかった写真は保存しません。");
    } catch (error) {
      setNoticeError(true);
      setNotice(saveErrorMessage(error));
    } finally {
      setBusy("");
    }
  }

  async function keepDraft(photoIndexes: number[] | null) {
    if (!draft) return;
    setBusy(photoIndexes === null ? "文章を更新しています" : "選んだ写真を保存しています");
    setNotice("");
    setNoticeError(false);
    try {
      const saved = await saveKept(draft, photoIndexes);
      setDraft(null);
      setUrl("");
      await reload();
      const photoNote =
        photoIndexes === null
          ? "写真は今のままです。"
          : saved.failedPhotos
            ? `写真は${saved.record.photoCount}枚残せました。${saved.failedPhotos}枚は取れませんでした。`
            : saved.record.photoCount
              ? `写真は${saved.record.photoCount}枚残しました。`
              : "写真は残していません。";
      setNotice(saved.updated ? `同じ車両を更新しました。${photoNote}` : `アカウントに保存しました。${photoNote}`);
    } catch (error) {
      setNoticeError(true);
      setNotice(error instanceof Error ? error.message : saveErrorMessage(error));
    } finally {
      setBusy("");
    }
  }

  async function moveLocal() {
    setBusy("このブラウザの車を移しています");
    setNotice("");
    setNoticeError(false);
    try {
      const local = await listListings();
      const known = new Set(listings.map((item) => item.id));
      let moved = 0;
      for (const record of local) {
        if (known.has(record.id)) continue;
        const stored = await getPhotos(record.id);
        const photos = stored.flatMap((photo) => {
          const blob = storedPhotoBlob(photo);
          if (!blob) return [];
          return [
            {
              bytes: new Uint8Array(),
              type: blob.type || "image/jpeg",
              caption: photo.caption,
              category: photo.category,
              blob,
            },
          ];
        });
        const ready = await Promise.all(
          photos.map(async (photo) => ({
            bytes: new Uint8Array(await photo.blob.arrayBuffer()),
            type: photo.type,
            caption: photo.caption,
            category: photo.category,
          })),
        );
        await uploadSavedCar(
          { ...record, savedPhotos: record.savedPhotos ?? ready.map((photo) => ({ caption: photo.caption, category: photo.category })) },
          ready,
        );
        await deleteListing(record.id);
        moved += 1;
      }
      setLocalCount(0);
      await reload();
      setNotice(moved ? `${moved}台をアカウントに移しました。` : "移す車はありませんでした。");
    } catch (error) {
      setNoticeError(true);
      setNotice(error instanceof Error ? error.message : "移せませんでした。");
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
    const blob = await buildBackup(listings, loadRemotePhotos);
    downloadBlob(blob, `nokosu-backup.zip`);
    setNoticeError(false);
    setNotice(`${listings.length}台を書き出しました。このファイルを別のブラウザで読み込めます。`);
  }

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const entries = await readBackup(file);
      for (const entry of entries) {
        await uploadSavedCar(entry.record, entry.photos);
      }
      await reload();
      setNoticeError(false);
      setNotice(`${entries.length}台をアカウントに読み込みました。`);
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
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <label htmlFor="carsensor-url" className="mb-2 block text-sm font-bold">
            中古車の詳細ページURL（カーセンサー・グーネット・カババ・ヤフオク）
          </label>
          <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Input
              id="carsensor-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="カーセンサー・グーネット・カババ・ヤフオクのURL"
              className="h-11 min-w-0 flex-1 bg-white text-base"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <Button type="submit" className="h-11 px-6 font-bold text-white" disabled={Boolean(busy)}>
              {busy || "のこす"}
            </Button>
          </form>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            掲載が生きているうちにURLを貼ると、価格・スペック・装備・販売店・写真をメモとして残します。
            {lineReady ? " 公式アプリの共有からLINEの「のこす」へ送ることもできます。" : ""}
          </p>
          {notice && (
            <p className={`mt-3 text-sm font-medium leading-6 ${noticeError ? "text-destructive" : "text-live"}`}>{notice}</p>
          )}
          {draft && (
            <PhotoPicker
              listing={draft}
              replacing={listings.some((item) => item.id === draft.id)}
              busy={busy}
              onKeep={(indexes) => void keepDraft(indexes)}
              onTextOnly={() => void keepDraft(null)}
              onCancel={() => setDraft(null)}
            />
          )}
        </section>

        {localCount > 0 && (
          <section className="rounded-xl border bg-card px-4 py-4 shadow-sm sm:px-6">
            <p className="text-sm leading-7">
              このブラウザに、アカウントへまだ移していない車が{localCount}台あります。移すと、他の端末からも見られます。
            </p>
            <Button className="mt-3" disabled={Boolean(busy)} onClick={() => void moveLocal()}>
              {busy || "このブラウザの保存をアカウントに移す"}
            </Button>
          </section>
        )}

        <div className="flex items-baseline justify-between border-b-2 border-orange pb-2">
          <h2 className="text-lg font-bold">ライブラリ</h2>
          <span className="text-muted-foreground text-xs font-medium">{listings.length}件</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="サイトで絞る">
            <SourceFilterButton active={sourceFilter === "all"} onClick={() => setSourceFilter("all")}>
              すべてのサイト（{counts.all}）
            </SourceFilterButton>
            {(["carsensor", "goonet", "kabaha", "yahoo-auction"] as Source[]).map((source) => (
              <SourceFilterButton
                key={source}
                source={source}
                active={sourceFilter === source}
                onClick={() => setSourceFilter(source)}
              >
                {SOURCE_LABEL[source]}（{counts[source]}）
              </SourceFilterButton>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="車名、店、メモ"
              className="h-9 w-full bg-card sm:w-48"
            />
            <Button
              variant="outline"
              aria-expanded={sortOpen}
              aria-controls="sort-panel"
              onClick={() => setSortOpen((open) => !open)}
              className={sort ? "border-[#E4682C] text-[#E4682C]" : ""}
            >
              並べ替え{sort ? `（${sortLabel(sort)}）` : ""} {sortOpen ? "−" : "＋"}
            </Button>
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
          {sortOpen && (
            <div id="sort-panel" className="space-y-2.5 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
              {SORT_OPTIONS.map((opt) => (
                <div key={opt.key} className="flex items-center gap-3">
                  <span className="w-[4.5rem] shrink-0 text-sm font-bold sm:w-24">{opt.label}</span>
                  <div className="grid min-w-0 flex-1 grid-cols-2 overflow-hidden rounded-lg border border-border shadow-sm">
                    {(["asc", "desc"] as const).map((dir) => {
                      const active = sort?.key === opt.key && sort.dir === dir;
                      return (
                        <button
                          key={dir}
                          type="button"
                          aria-pressed={active}
                          data-sort={`${opt.key}-${dir}`}
                          onClick={() => setSort(active ? null : { key: opt.key, dir })}
                          className={`h-10 text-sm font-bold ${dir === "desc" ? "border-l border-border" : ""} ${active ? "bg-[#E4682C] text-white" : "bg-card text-muted-foreground"}`}
                        >
                          {dir === "asc" ? opt.asc : opt.desc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-muted-foreground text-xs">もう一度押すと解除します（解除すると保存が新しい順）。データのない車は最後に並びます。</p>
            </div>
          )}
        </div>

        {!ready ? (
          <p className="text-muted-foreground text-sm">保存を読み込んでいます</p>
        ) : listings.length === 0 ? (
          <EmptyLibrary />
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed bg-card px-5 py-8 text-center text-sm">条件に合う車はありません。</p>
        ) : (
          <ul className="min-w-0 space-y-3">
            {visible.map((listing) => {
              const heading = vehicleHeading(listing);
              const change = priceChange(listing);
              const info = cardInfo(listing);
              const base = listing.totalPrice && listing.basePrice && listing.basePrice !== listing.totalPrice ? listing.basePrice : "";
              const ended = listing.availability === "ended";
              const status = ended
                ? "掲載終了"
                : change.kind === "same"
                  ? listing.availability === "live"
                    ? "掲載中"
                    : "未確認"
                  : change.label;
              return (
              <li key={listing.id} className={`relative min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm ${listing.watchStatus === "passed" ? "opacity-60" : ""}`}>
                <div className="relative">
                  <Link href={`/listings/${listing.id}`} className="block">
                    <div className="bg-muted aspect-[16/10] w-full overflow-hidden">
                      {listing.photoCount > 0 ? (
                        <ArchiveImage src={photoSrc(listing.id, 0, listing.updatedAt)} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="text-muted-foreground grid size-full place-items-center text-xs">写真なし</div>
                      )}
                    </div>
                  </Link>
                </div>
                <Link href={`/listings/${listing.id}`} className="block min-w-0 border-t-2 border-t-[#E4682C] p-3 pb-1 sm:p-4 sm:pb-1">
                  {heading.maker && <p className="text-muted-foreground text-xs font-medium tracking-wide">{heading.maker}</p>}
                  <h2 className="line-clamp-2 break-words text-[17px] font-bold leading-snug">{heading.heading || displayName(listing)}</h2>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="flex items-baseline gap-1 leading-none">
                      <span className="text-muted-foreground text-[11px] font-bold">支払総額</span>
                      <span className="text-[26px] font-extrabold tabular-nums text-[#E4682C]" data-card="total">{priceNumber(listing.totalPrice || listing.basePrice)}</span>
                      {showsMan(listing.totalPrice || listing.basePrice) && <span className="text-sm font-bold">万円</span>}
                    </p>
                    {base && (
                      <p className="text-muted-foreground text-[15px]">車体価格 <span className="font-medium tabular-nums text-foreground">{base}</span></p>
                    )}
                  </div>
                  <div className="mt-2.5"><SpecChips info={info} /></div>
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
                    <span className="mr-1 inline-flex"><SourceBadge record={listing} /></span>
                    <span className={ended ? "font-bold text-black" : status === "掲載中" ? "text-live" : change.kind === "down" ? "text-live font-bold" : "text-muted-foreground"}>{status}</span>
                    <span className="text-muted-foreground"> ・ {watchLabel(listing.watchStatus)}</span>
                    {info.region && <span className="text-muted-foreground"> ・ {info.region}</span>}
                  </p>
                </Link>
                <div className="flex justify-end px-2 pb-1.5 sm:px-3">
                  <label className="flex min-h-10 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[11px] font-medium text-muted-foreground">
                    <input type="checkbox" className="size-3.5" checked={compareIds.includes(listing.id)} onChange={() => toggleCompare(listing.id)} />
                    比べる
                  </label>
                </div>
              </li>
              );
            })}
          </ul>
        )}

        <LineAddCard />

        <footer className="text-muted-foreground border-t pt-5 text-xs leading-6">
          のこすは各掲載サイトとは関係のない個人用のメモです。掲載の文章と写真の権利は販売店・出品者と各サイトにあります。保存した車はこのアカウントに残るので、同じメールアドレスで別の端末からも見られます。掲載が続いているかと価格は、毎日朝に自動で確認します。値下げと値上げは一覧に出ます。
        </footer>
      </main>

      {compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
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
                <Button nativeButton={false} render={<Link href="/compare" />}>並べて見る</Button>
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

function SourceFilterButton({
  active,
  onClick,
  source,
  children,
}: {
  active: boolean;
  onClick: () => void;
  source?: Source;
  children: React.ReactNode;
}) {
  const activeTone = source ? SOURCE_BADGE_CLASS[source] : "border-[#4B5563] bg-[#4B5563] text-white";
  const tone = active ? activeTone : "border-border bg-card text-muted-foreground";
  return (
    <button
      type="button"
      aria-pressed={active}
      data-source-filter={source ?? "all"}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold ${tone}`}
    >
      {children}
    </button>
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
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold ${active ? "border-[#E4682C] bg-[#E4682C] text-white" : "border-border bg-card text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function EmptyLibrary() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center text-sm leading-7 text-muted-foreground">
      まだ何も残っていません。上のフォームにURLを貼るか、LINEから共有してください。
    </div>
  );
}
