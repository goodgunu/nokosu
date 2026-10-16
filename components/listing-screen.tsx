"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, MoreHorizontal, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { LineAddCard } from "@/components/line-add-link";
import { PhotoGallery } from "@/components/photo-gallery";
import { PhotoPicker } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { buildBackup, downloadBlob } from "@/lib/backup";
import { SpecChips, priceNumber, showsMan } from "@/components/spec-chip";
import { cardInfo } from "@/lib/card-info";
import { SourceBadge } from "@/components/source-badge";
import { SOURCE_LABEL, sourceOf } from "@/lib/sites";
import { displayName, formatCheck, formatMonthDay, formatWhen, isBlankValue, ledgerFacts, vehicleHeading } from "@/lib/format";
import { priceChange } from "@/lib/price-history";
import { checkListing, deleteRemoteListing, fetchListing, loadRemotePhotos, patchListing, photoSrc, saveKept } from "@/lib/remote";
import { requestArchive, saveErrorMessage } from "@/lib/save-listing";
import { WATCH_STATUSES, type ArchiveRecord, type MemoEntry, type ParsedListing, type TableSection, type WatchStatus } from "@/lib/types";

export function ListingScreen({ id, startPicking = false }: { id: string; startPicking?: boolean }) {
  const router = useRouter();
  const [record, setRecord] = useState<ArchiveRecord | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<ParsedListing | null>(null);
  const pickStarted = useRef(false);

  useEffect(() => {
    if (!startPicking || !record || pickStarted.current) return;
    pickStarted.current = true;
    const sourceUrl = record.sourceUrl;
    let cancelled = false;
    requestArchive(sourceUrl)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "ok") {
          setDraft(result.listing);
          setMessage("残す写真を選んでください。選ばなかった写真は保存しません。");
          return;
        }
        if (result.status === "ended") {
          setMessage("元の掲載は終了していました。保存してある内容はこのまま見られます。");
          return;
        }
        setMessage(result.message);
      })
      .catch((error) => {
        if (!cancelled) setMessage(saveErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [startPicking, record]);

  useEffect(() => {
    let cancelled = false;
    fetchListing(id).then((found) => {
      if (cancelled) return;
      setRecord(found ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function addNote() {
    if (!record) return;
    const text = note.trim();
    if (!text) return;
    const existing = record.memoEntries?.length
      ? record.memoEntries
      : record.memo.trim()
        ? [{ at: record.savedAt, text: record.memo.trim() }]
        : [];
    const memoEntries: MemoEntry[] = [...existing, { at: new Date().toISOString(), text: text.slice(0, 500) }].slice(-40);
    const memo = memoEntries.map((entry) => entry.text).join("\n").slice(0, 4000);
    setNote("");
    setRecord({ ...record, memo, memoEntries });
    try {
      const next = await patchListing(record.id, { memo, memoEntries });
      setRecord(next.record);
    } catch (error) {
      setMessage(saveErrorMessage(error));
    }
  }

  async function refresh(mode: "check" | "update") {
    if (!record) return;
    setBusy(mode === "check" ? "掲載を確認しています" : "内容を取り直しています");
    setMessage("");
    try {
      if (mode === "check") {
        const checked = await checkListing(record.id);
        setRecord(checked.record);
        if (checked.failed) {
          setMessage("掲載ページを確認できませんでした。明日の自動確認で、もう一度見ます。");
          return;
        }
        if (checked.record.availability === "ended") {
          setMessage("元の掲載は終了していました。保存してある内容はこのまま見られます。");
          return;
        }
        if (checked.price.kind === "same") {
          setMessage("まだ掲載されています。価格は変わっていません。");
          return;
        }
        setMessage(
          checked.price.previous
            ? `${checked.price.label}でした。前回は${checked.price.previous}です。`
            : `${checked.price.label}でした。`,
        );
        return;
      }
      const result = await requestArchive(record.sourceUrl);
      if (result.status === "ended") {
        const next = await patchListing(record.id, {
          availability: "ended",
          lastCheckedAt: new Date().toISOString(),
        });
        setRecord(next.record);
        setMessage("元の掲載は終了していました。保存してある内容はこのまま見られます。");
        return;
      }
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setDraft(result.listing);
      setMessage("残す写真を選んでください。選ばなかった写真は保存しません。");
    } catch (error) {
      setMessage(saveErrorMessage(error));
    } finally {
      setBusy("");
    }
  }

  async function keepDraft(photoIndexes: number[] | null) {
    if (!draft) return;
    setBusy(photoIndexes === null ? "文章を更新しています" : "選んだ写真を保存しています");
    setMessage("");
    try {
      const saved = await saveKept(draft, photoIndexes);
      setRecord(saved.record);
      setDraft(null);
      router.replace(`/listings/${id}`);
      setMessage(
        photoIndexes === null
          ? "文章を更新しました。写真は今のままです。"
          : saved.failedPhotos
            ? `更新しました。写真は${saved.record.photoCount}枚残せました。${saved.failedPhotos}枚は取れませんでした。`
            : "更新しました。",
      );
    } catch (error) {
      setMessage(saveErrorMessage(error));
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    await deleteRemoteListing(id);
    router.push("/");
  }

  async function exportOne() {
    if (!record) return;
    const blob = await buildBackup([record], loadRemotePhotos);
    downloadBlob(blob, `nokosu-${record.id}.zip`);
  }

  if (record === undefined) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground sm:px-6">読み込み中</main>
      </>
    );
  }

  if (!record) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h1 className="font-heading text-3xl">この保存は見つかりません</h1>
          <p className="text-muted-foreground mt-3 leading-7">
            このアカウントには、その車両の控えがありません。
          </p>
          <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
            一覧へ戻る
          </Button>
        </main>
      </>
    );
  }

  const heading = vehicleHeading(record);
  const name = heading.heading || displayName(record);
  const photos = (record.savedPhotos ?? []).map((photo, index) => ({
    url: photoSrc(record.id, index, record.updatedAt),
    caption: photo.caption,
    category: photo.category,
  }));
  const facts = ledgerFacts(record);
  const keyFacts = facts.filter((item) => item.label !== "修復歴");
  const equipped = record.equipment.flatMap((group) => group.items.filter((item) => item.equipped).map((item) => item.name));
  const detailSections = record.sections
    .map(visibleSection)
    .filter((section): section is TableSection => Boolean(section));
  const info = cardInfo(record);
  const checked = record.lastCheckedAt ? formatCheck(record.lastCheckedAt) : "";
  const change = priceChange(record);
  const notes: MemoEntry[] = record.memoEntries?.length
    ? record.memoEntries
    : record.memo.trim()
      ? [{ at: record.savedAt, text: record.memo.trim() }]
      : [];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-0 px-4 pt-5 pb-28 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-muted-foreground inline-flex items-center gap-1 text-sm font-medium hover:text-foreground">
            <ArrowLeft className="size-4" />
            保存した車
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground px-2 text-lg tracking-widest" aria-label="その他の操作">
              <MoreHorizontal className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={Boolean(busy)} onClick={() => void refresh("update")}>
                内容を取り直す
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportOne()}>書き出す</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmDelete(true)}>削除</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 min-w-0">
          {draft ? (
            <PhotoPicker
              listing={draft}
              replacing={record.photoCount > 0}
              busy={busy}
              onKeep={(indexes) => void keepDraft(indexes)}
              onTextOnly={() => void keepDraft(null)}
                onCancel={() => {
                  setDraft(null);
                  router.replace(`/listings/${id}`);
                }}
            />
          ) : photos.length > 0 ? (
            <div>
              <PhotoGallery photos={photos} title={name} />
              <Button
                type="button"
                className="mt-3 h-12 w-full text-base font-bold text-white"
                style={{ background: "#E4682C" }}
                disabled={Boolean(busy)}
                onClick={() => void refresh("update")}
              >
                写真を選び直す
              </Button>
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-xl border px-6 text-center">
              <p>{busy || "残す写真はまだ選んでいません"}</p>
              <Button disabled={Boolean(busy)} onClick={() => void refresh("update")}>
                写真を選ぶ
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border bg-card px-3 py-2 text-sm shadow-sm">
          <span>
            <span className={`mr-2 inline-block size-1.5 rounded-full align-middle ${record.availability === "live" ? "bg-live" : "bg-[#b5b5b5]"}`} />
            <span className={record.availability === "ended" ? "font-bold text-black" : record.availability === "live" ? "text-live" : ""}>
              {record.availability === "ended" ? "掲載終了" : record.availability === "live" ? "掲載中" : "まだ確認していません"}
            </span>
            {checked ? <span className="text-muted-foreground"> ・ {checked}に確認</span> : null}
          </span>
          <span className={change.kind === "down" ? "text-live font-bold" : "text-muted-foreground"}>{change.label}</span>
        </div>

        <div className="mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        {heading.maker && <p className="text-muted-foreground text-xs font-medium tracking-wide">{heading.maker}</p>}
        <h1 className="break-words text-[19px] font-bold leading-snug">{name}</h1>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="flex items-baseline gap-1 leading-none">
            <span className="text-muted-foreground text-[11px] font-bold">{record.totalPrice ? "支払総額" : "車両本体"}</span>
            <span className="text-[26px] font-extrabold tabular-nums text-[#E4682C]">{priceNumber(record.totalPrice || record.basePrice)}</span>
            {showsMan(record.totalPrice || record.basePrice) && <span className="text-sm font-bold">万円</span>}
          </p>
          {record.basePrice && record.totalPrice && record.basePrice !== record.totalPrice && (
            <p className="text-muted-foreground text-[15px]">
              車体価格 <span className="font-medium tabular-nums text-foreground">{record.basePrice}</span>
              {record.expenseNote ? <span className="text-xs"> {record.expenseNote}</span> : null}
            </p>
          )}
        </div>
        <div className="mt-2.5"><SpecChips info={info} /></div>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
          <span className="mr-1 inline-flex"><SourceBadge record={record} /></span>
          <span className={record.availability === "ended" ? "font-bold text-black" : record.availability === "live" ? "text-live" : "text-muted-foreground"}>
            {record.availability === "ended" ? "掲載終了" : record.availability === "live" ? "掲載中" : "未確認"}
          </span>
          {info.region && <span className="text-muted-foreground"> ・ {info.region}</span>}
        </p>
        {change.kind !== "same" && change.previous && (
          <p className={`mt-1 text-sm ${change.kind === "down" ? "text-live" : ""}`}>前回 {change.previous}</p>
        )}
        </div>

        <div className="mt-4 flex rounded-full border bg-card p-1">
          {WATCH_STATUSES.map((status) => (
            <button
              key={status.id}
              type="button"
              className={`flex-1 rounded-full px-1 py-2 text-xs ${record.watchStatus === status.id ? "bg-[#E4682C] font-bold text-white" : "text-muted-foreground"}`}
              onClick={() => {
                const next = status.id as WatchStatus;
                setRecord({ ...record, watchStatus: next });
                void patchListing(record.id, { watchStatus: next });
              }}
            >
              {status.label}
            </button>
          ))}
        </div>

        {keyFacts.length > 0 && (
          <section className="mt-8">
            <h2 className="border-b-2 border-orange pb-1 text-sm font-bold">要点</h2>
            <dl className="mt-2 grid grid-cols-2 rounded-xl border bg-card px-4 shadow-sm">
              {keyFacts.map((item, index) => (
                <div key={item.label} className={`border-b py-2 ${index % 2 === 1 ? "border-l pl-3" : "pr-3"}`}>
                  <dt className="text-muted-foreground text-[11px]">{item.label}</dt>
                  <dd className="mt-0.5 text-sm">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-8 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold">自分のメモ</h2>
            <span className="text-muted-foreground text-[11px]">{notes.length ? `${notes.length}件` : ""}</span>
          </div>
          {notes.map((entry, index) => (
            <div key={`${entry.at}-${index}`} className="mt-3 flex gap-3 text-sm">
              <span className="text-muted-foreground w-10 shrink-0 tabular-nums">{formatMonthDay(entry.at)}</span>
              <p className="leading-6">{entry.text}</p>
            </div>
          ))}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void addNote();
            }}
          >
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="メモを追加"
              className="h-10 bg-background text-base"
            />
            <Button type="submit" variant="outline" className="shrink-0" disabled={!note.trim()}>
              残す
            </Button>
          </form>
        </section>

        <div className="mt-6 rounded-xl border bg-card px-4 shadow-sm">
          {equipped.length > 0 && (
            <details className="border-b py-3">
              <summary className="cursor-pointer text-sm">装備 <span className="text-muted-foreground">{equipped.length}</span></summary>
              <ul className="mt-3 flex flex-wrap gap-2">
                {equipped.map((item) => (
                  <li key={item} className="rounded-full border px-3 py-1 text-sm">{item}</li>
                ))}
              </ul>
            </details>
          )}
          {detailSections.map((section) => (
            <details key={section.id} className="border-b py-3">
              <summary className="cursor-pointer text-sm">{section.title}</summary>
              {section.columns.length > 0 ? (
                <div className="mt-3 min-w-0 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1 pr-3 font-normal" />
                        {section.columns.map((column) => (
                          <th key={column} className="py-1 pr-3 font-normal">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={row.label} className="border-t">
                          <th className="py-2 pr-3 align-top font-medium whitespace-nowrap">{row.label}</th>
                          {row.values.map((value, valueIndex) => (
                            <td key={`${row.label}-${valueIndex}`} className="py-2 pr-3 align-top leading-6">{value}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <dl className="mt-2">
                  {section.rows.map((row) => (
                    <div key={row.label} className="border-t py-2">
                      <dt className="text-muted-foreground text-xs">{row.label}</dt>
                      <dd className="mt-1 text-sm leading-6">{row.values.filter((value) => !isBlankValue(value)).join(" / ")}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </details>
          ))}
          {record.qualityComment && (
            <details className="border-b py-3">
              <summary className="cursor-pointer text-sm">販売店コメント</summary>
              <p className="text-muted-foreground mt-2 text-sm leading-7">{record.qualityComment}</p>
            </details>
          )}
        </div>

        <section className="py-5">
          <h2 className="border-b-2 border-orange pb-1 text-sm font-bold">販売店</h2>
          <p className="text-muted-foreground mt-3 text-[11px]">店名</p>
          <p className="mt-1 text-sm">{record.shopName || "店名は保存されていません"}</p>
          {record.shopAddress && <p className="text-muted-foreground mt-1 text-sm">{record.shopAddress}</p>}
          {record.shopUrl && (
            <a href={record.shopUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm underline underline-offset-4">
              お店のページ
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <p className="text-muted-foreground mt-4 text-[11px]">
            {formatWhen(record.savedAt)} 保存
            {record.photoTotal ? ` ・ 写真 ${record.photoCount} / ${record.photoTotal}枚` : ` ・ 写真 ${record.photoCount}枚`}
          </p>
          {message && <p className="mt-3 text-sm leading-6">{message}</p>}
          {busy && (
            <p className="text-muted-foreground mt-2 inline-flex items-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin" />
              {busy}
            </p>
          )}
        </section>
        <LineAddCard />
      </main>

      {!draft && (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button variant="outline" className="h-11 flex-1 rounded-full" disabled={Boolean(busy)} onClick={() => void refresh("check")}>
            掲載を確認
          </Button>
          <Button className="h-11 flex-[1.4] rounded-full font-bold" nativeButton={false} render={<a href={record.sourceUrl} target="_blank" rel="noreferrer" />}>
            {SOURCE_LABEL[sourceOf(record)]}で開く
          </Button>
        </div>
      </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>この保存を消しますか</DialogTitle>
            <DialogDescription>
              {name}の文章と写真を、アカウントから消します。書き出していなければ戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              やめる
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function visibleSection(section: TableSection): TableSection | null {
  const hidden = new Set(["修復歴", "保証", "保証期間", "車検", "車検有無", "法定整備", "ミッション", "ミッション詳細", "地域", "年式", "年式(初度登録年)", "走行距離"]);
  const rows = section.rows.filter((row) => !hidden.has(row.label) && row.values.some((value) => !isBlankValue(value)));
  if (!rows.length) return null;
  if (!section.columns.length) return { ...section, rows };
  const used = section.columns.map((_, index) => rows.some((row) => !isBlankValue(row.values[index] || "")));
  if (used.every((item) => !item)) return null;
  return {
    ...section,
    columns: section.columns.filter((_, index) => used[index]),
    rows: rows.map((row) => ({ ...row, values: row.values.filter((_, index) => used[index]) })),
  };
}

