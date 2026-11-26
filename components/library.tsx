"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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
import { SORT_PRESETS, presetIdOf, sortListings, type SortState } from "@/lib/library-sort";
import {
  NO_EXTRA_FILTER,
  filterListings,
  isExtraActive,
  makerOptions,
  matchesExtra,
  sourceCounts,
  type AvailabilityFilter,
  type ExtraFilter,
  type SourceFilter,
} from "@/lib/library-filter";
import { NotifySettingCard } from "@/components/notify-setting";
import { LibraryPager } from "@/components/library-pager";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, PAGE_SIZE_KEY, paginate, parsePage, parsePageSize, type PageSize } from "@/lib/library-page";
import { SOURCE_LABEL, sourceOf, type Source } from "@/lib/sites";
import { priceChange } from "@/lib/price-history";
import { photoSrc, fetchListings, loadRemotePhotos, patchListing, saveKept, uploadSavedCar } from "@/lib/remote";
import { requestArchive, saveErrorMessage } from "@/lib/save-listing";
import { watchLabel, type ArchiveRecord, type ParsedListing } from "@/lib/types";
import { rememberListing } from "@/lib/listing-cache";
import { Collapse, NAV_FORWARD, Presence, SharedElement, Spinner, Stagger, usePop, vtName } from "@/lib/motion";


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
  const [extra, setExtra] = useState<ExtraFilter>(NO_EXTRA_FILTER);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  // ページ分け: 表示件数はこのブラウザに覚える。今のページは ?page= に残す
  const [pageSize, setPageSize] = useState<PageSize>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    try {
      return parsePageSize(localStorage.getItem(PAGE_SIZE_KEY));
    } catch {
      return DEFAULT_PAGE_SIZE;
    }
  });
  const [page, setPage] = useState(() =>
    typeof window === "undefined" ? 1 : parsePage(new URLSearchParams(window.location.search).get("page")),
  );
  const listTopRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ParsedListing | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  // 保存できたら「のこす」ボタンに少しだけチェックを出す
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 最初の表示だけカードを時間差で出す。ページを切り替えた後はクロスフェード
  const [introDone, setIntroDone] = useState(false);
  const [toolsOpen, setToolsOpen] = useState<"" | "filters" | "backup">("");

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
    return sortListings(
      filterListings(listings, "all", sourceFilter, query).filter((listing) => matchesExtra(listing, extra)),
      sort,
    );
  }, [listings, query, sourceFilter, sort, extra]);
  // 並べ替え・絞り込み・表示件数が変わったら1ページ目に戻す
  const pageResetKey = JSON.stringify([query, sourceFilter, sort, extra, pageSize]);
  const [lastResetKey, setLastResetKey] = useState(pageResetKey);
  if (pageResetKey !== lastResetKey) {
    setLastResetKey(pageResetKey);
    setPage(1);
  }
  const paged = useMemo(() => paginate(visible, page, pageSize), [visible, page, pageSize]);

  // 今のページを URL の ?page= に残す（1ページ目は付けない）。読み込みが終わってから
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    const current = url.searchParams.get("page");
    const want = paged.page > 1 ? String(paged.page) : null;
    if (current === want) return;
    if (want) url.searchParams.set("page", want);
    else url.searchParams.delete("page");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [ready, paged.page]);

  function goToPage(next: number) {
    // ページを切り替えた後は、時間差ではなく中身ごとクロスフェード（motion-crossfade）
    setIntroDone(true);
    setPage(next);
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function flashSaved() {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSaved(true);
    savedTimer.current = setTimeout(() => setSaved(false), 1600);
  }


  function changePageSize(next: PageSize) {
    setPageSize(next);
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(next));
    } catch {
      // 保存できないブラウザでは、この画面の間だけ使う
    }
  }

  const makers = useMemo(() => makerOptions(listings), [listings]);
  const favoriteCount = useMemo(() => listings.filter((listing) => listing.favorite).length, [listings]);

  async function toggleFavorite(id: string) {
    const current = listings.find((item) => item.id === id);
    if (!current) return;
    const nextValue = !current.favorite;
    setListings((rows) => rows.map((row) => (row.id === id ? { ...row, favorite: nextValue || undefined } : row)));
    try {
      await patchListing(id, { favorite: nextValue });
    } catch {
      setListings((rows) => rows.map((row) => (row.id === id ? { ...row, favorite: current.favorite } : row)));
      setNoticeError(true);
      setNotice("お気に入りを保存できませんでした。もう一度お試しください。");
    }
  }
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
      flashSaved();
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
      flashSaved();
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
            <Button type="submit" className="h-11 gap-1.5 px-6 font-bold text-white" disabled={Boolean(busy)} data-control="save" data-state={busy ? "busy" : saved ? "done" : "idle"}>
              {busy ? (
                <>
                  <Spinner className="size-4 shrink-0" label="保存しています" />
                  {busy}
                </>
              ) : saved ? (
                <>
                  <Check className="motion-pop size-4 shrink-0" strokeWidth={3} aria-hidden />
                  のこす
                </>
              ) : (
                "のこす"
              )}
            </Button>
          </form>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            掲載が生きているうちにURLを貼ると、価格・スペック・装備・販売店・写真をメモとして残します。
            {lineReady ? " 公式アプリの共有からLINEの「のこす」へ送ることもできます。" : ""}
          </p>
          <Presence show={Boolean(notice)} variant="fade" appear as="p" className={`mt-3 text-sm font-medium leading-6 ${noticeError ? "text-destructive" : "text-live"}`}>
            {notice}
          </Presence>
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
              aria-expanded={toolsOpen === "filters"}
              aria-controls="library-filters"
              data-control="toggle-filters"
              className={sort || isExtraActive(extra) ? "border-[#E7692F] text-[#9C3D12]" : undefined}
              onClick={() => setToolsOpen((open) => (open === "filters" ? "" : "filters"))}
            >
              並べ替え・絞り込み
              {(sort ? 1 : 0) + (isExtraActive(extra) ? 1 : 0) > 0 && (
                <span className="grid size-4 place-items-center rounded-full bg-[#E4682C] text-[10px] text-white">{(sort ? 1 : 0) + (isExtraActive(extra) ? 1 : 0)}</span>
              )}
              <ChevronDown className="size-4 transition-transform duration-[var(--motion-dur-short)] ease-[var(--motion-ease-out)] [[aria-expanded=true]>&]:rotate-180" aria-hidden />
            </Button>
            <Button
              variant="outline"
              aria-expanded={toolsOpen === "backup"}
              aria-controls="library-backup"
              data-control="toggle-backup"
              onClick={() => setToolsOpen((open) => (open === "backup" ? "" : "backup"))}
            >
              書き出し・読み込み
              <ChevronDown className="size-4 transition-transform duration-[var(--motion-dur-short)] ease-[var(--motion-ease-out)] [[aria-expanded=true]>&]:rotate-180" aria-hidden />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => void onImport(event.target.files?.[0])}
            />
          </div>
          <Collapse open={toolsOpen === "backup"} id="library-backup">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
              <p className="text-muted-foreground w-full text-xs leading-5">保存した車と写真を1つのファイルにまとめます。別のブラウザで読み込めます。</p>
              <Button variant="outline" onClick={() => void exportAll()}>
                書き出す
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                読み込む
              </Button>
            </div>
          </Collapse>
          <Collapse open={toolsOpen === "filters"} id="library-filters">
          <div className="grid grid-cols-2 gap-2 p-0.5 sm:grid-cols-[1fr_1fr_auto]" aria-label="並べ替えと絞り込み">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-muted-foreground text-[11px] font-bold">並べ替え</span>
              <select
                data-control="sort"
                value={presetIdOf(sort)}
                onChange={(event) => {
                  const preset = SORT_PRESETS.find((item) => item.id === event.target.value);
                  setSort(preset && preset.id !== "saved-desc" ? preset.sort : null);
                }}
                className={`h-10 w-full min-w-0 rounded-lg border bg-card px-2 text-sm font-bold ${sort ? "border-[#E7692F] text-[#E7692F]" : "border-border"}`}
              >
                {SORT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-muted-foreground text-[11px] font-bold">メーカー</span>
              <select
                data-control="maker"
                value={extra.maker}
                onChange={(event) => setExtra((current) => ({ ...current, maker: event.target.value }))}
                className={`h-10 w-full min-w-0 rounded-lg border bg-card px-2 text-sm font-bold ${extra.maker ? "border-[#E7692F] text-[#E7692F]" : "border-border"}`}
              >
                <option value="">すべてのメーカー</option>
                {makers.map((item) => (
                  <option key={item.maker} value={item.maker}>
                    {item.maker}（{item.count}）
                  </option>
                ))}
              </select>
            </label>
            <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:self-end">
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border shadow-sm" role="group" aria-label="掲載の状態">
                {([
                  ["all", "すべて"],
                  ["live", "掲載中"],
                  ["ended", "掲載終了"],
                ] as [AvailabilityFilter, string][]).map(([value, label], index) => {
                  const active = extra.availability === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      data-availability={value}
                      onClick={() => setExtra((current) => ({ ...current, availability: value }))}
                      className={`h-10 px-3 text-sm font-bold ${index ? "border-l border-border" : ""} ${active ? "bg-[#E7692F] text-white" : "bg-card text-muted-foreground"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                aria-pressed={extra.favoritesOnly}
                data-control="favorites"
                onClick={() => setExtra((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))}
                className={`inline-flex h-10 items-center gap-1 rounded-lg border px-3 text-sm font-bold ${extra.favoritesOnly ? "border-[#E7692F] bg-[#E7692F] text-white" : "border-border bg-card text-muted-foreground"}`}
              >
                <HeartIcon filled={extra.favoritesOnly} color={extra.favoritesOnly ? "#FFFFFF" : undefined} className="size-4" />
                お気に入り（{favoriteCount}）
              </button>
            </div>
          </div>
          </Collapse>
          {isExtraActive(extra) && (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              {visible.length}台を表示中
              <button type="button" className="font-bold text-[#E7692F] underline" onClick={() => setExtra(NO_EXTRA_FILTER)}>
                絞り込みを解除
              </button>
            </p>
          )}
        </div>

        {!ready ? (
          // 読み込み中も一覧ぶんの高さを取っておく（下のLINE通知などが先に出て、あとで押し下げられるズレ＝CLSを防ぐ）
          <p className="text-muted-foreground min-h-[100svh] text-sm">保存を読み込んでいます</p>
        ) : listings.length === 0 ? (
          <EmptyLibrary />
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed bg-card px-5 py-8 text-center text-sm">条件に合う車はありません。</p>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center text-sm leading-7 text-muted-foreground">
            条件に合う車がありません。絞り込みを変えてみてください。
          </div>
        ) : (
          <div ref={listTopRef} className="min-w-0 scroll-mt-3" data-library="paged">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2" data-library="page-info">
            <p className="text-sm" aria-live="polite">
              <span className="font-bold tabular-nums">{paged.total}</span>台中{" "}
              <span className="font-bold tabular-nums">{paged.from}〜{paged.to}</span>台を表示
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs font-bold">表示件数</span>
              <select
                data-control="page-size"
                value={pageSize}
                onChange={(event) => changePageSize(parsePageSize(event.target.value))}
                className="h-11 rounded-lg border border-border bg-card px-3 text-sm font-bold"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}件
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(() => {
            const cards = paged.items.map((listing) => {
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
              <li
                key={listing.id}
                className={`motion-press motion-lift relative min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm ${listing.watchStatus === "passed" ? "opacity-60" : ""}`}
              >
                <div className="relative">
                  <FavoriteButton id={listing.id} favorite={Boolean(listing.favorite)} onToggle={() => void toggleFavorite(listing.id)} />
                  <Link href={`/listings/${listing.id}`} className="block" transitionTypes={[NAV_FORWARD]} onClick={() => rememberListing(listing)}>
                    <SharedElement name={vtName("photo", listing.id)}>
                    <div className="bg-muted aspect-[16/10] w-full overflow-hidden" data-card-photo={listing.id}>
                      {listing.photoCount > 0 ? (
                        <ArchiveImage src={photoSrc(listing.id, 0, listing.updatedAt)} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="text-muted-foreground grid size-full place-items-center text-xs">写真なし</div>
                      )}
                    </div>
                    </SharedElement>
                  </Link>
                </div>
                <Link href={`/listings/${listing.id}`} transitionTypes={[NAV_FORWARD]} onClick={() => rememberListing(listing)} className="block min-w-0 border-t-2 border-t-[#E4682C] p-3 pb-1 sm:p-4 sm:pb-1">
                  {heading.maker && <p className="text-muted-foreground text-xs font-medium tracking-wide">{heading.maker}</p>}
                  <h2 className="line-clamp-2 break-words text-[17px] font-bold leading-snug">{heading.heading || displayName(listing)}</h2>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="flex items-baseline gap-1 leading-none">
                      <span className={`text-muted-foreground font-bold ${sourceOf(listing) === "yahoo-auction" && !ended ? "text-[15px]" : "text-[11px]"}`}>{sourceOf(listing) === "yahoo-auction" && !ended ? "現在の" : ""}支払総額</span>
                      <span className="text-[26px] font-extrabold tabular-nums text-[#E4682C]" data-card="total">{priceNumber(listing.totalPrice || listing.basePrice)}</span>
                      {showsMan(listing.totalPrice || listing.basePrice) && <span className="text-sm font-bold">万円</span>}
                    </p>
                    {base && (
                      <p className="text-muted-foreground text-[15px]">{sourceOf(listing) === "yahoo-auction" && !ended ? "現在の" : ""}車体価格 <span className="font-medium tabular-nums text-foreground">{base}</span></p>
                    )}
                  </div>
                  <div className="mt-2.5"><SpecChips info={info} /></div>
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
                    <span className="mr-1 inline-flex"><SourceBadge record={listing} /></span>
                    <span className={`${ended ? "font-bold text-black" : status === "掲載中" ? "font-bold text-live" : change.kind === "down" ? "text-live font-bold" : "text-muted-foreground"} ${!ended && change.kind === "down" ? "motion-pop inline-block" : ""}`} data-card="status">{status}</span>
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
            });
            // 最初の表示は上から順に時間差で出す（最初の10件まで）。ページを切り替えた後は中身ごとクロスフェード
            return introDone ? (
              <ul key={`page-${paged.page}`} className="motion-crossfade min-w-0 space-y-3" data-library="cards">
                {cards}
              </ul>
            ) : (
              <Stagger as="ul" skip={1} className="min-w-0 space-y-3">
                {cards}
              </Stagger>
            );
          })()}
          <LibraryPager page={paged.page} totalPages={paged.totalPages} onChange={goToPage} />
          </div>
        )}

        <NotifySettingCard />

        <LineAddCard />

        <footer className="text-muted-foreground border-t pt-5 text-xs leading-6">
          のこすは各掲載サイトとは関係のない個人用のメモです。掲載の文章と写真の権利は販売店・出品者と各サイトにあります。保存した車はこのアカウントに残るので、同じメールアドレスで別の端末からも見られます。掲載が続いているかと価格は、毎日朝に自動で確認します。値下げとアップは一覧に出ます。LINEとつないでいると、お気に入りに入れた車の値下げや掲載終了をLINEでもお知らせします（1日1通まで）。
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

function EmptyLibrary() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center text-sm leading-7 text-muted-foreground">
      まだ何も残っていません。上のフォームにURLを貼るか、LINEから共有してください。
    </div>
  );
}

function HeartIcon({ filled, className, color }: { filled: boolean; className?: string; color?: string }) {
  const tone = color ?? "#E7692F";
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill={filled ? tone : "none"} stroke={filled ? tone : "currentColor"} strokeWidth={2} strokeLinejoin="round">
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
    </svg>
  );
}

// ♡ボタン。お気に入りに入れた時だけポンと弾む（usePop）
function FavoriteButton({ id, favorite, onToggle }: { id: string; favorite: boolean; onToggle: () => void }) {
  const [popRef, pop] = usePop<HTMLButtonElement>();
  return (
    <button
      ref={popRef}
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? "お気に入りから外す" : "お気に入りに入れる"}
      data-favorite={id}
      onClick={() => {
        if (!favorite) pop();
        onToggle();
      }}
      className="absolute top-2 right-2 z-10 grid size-10 place-items-center rounded-full bg-white/95 text-[#6B6560] shadow-md"
    >
      <HeartIcon filled={favorite} className="size-5" />
    </button>
  );
}
