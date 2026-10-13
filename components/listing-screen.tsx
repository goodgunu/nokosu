"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PhotoGallery } from "@/components/photo-gallery";
import { PhotoPicker } from "@/components/photo-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { buildBackup, downloadBlob } from "@/lib/backup";
import { displayName, factValue, formatWhen, formatYen, gradeLine } from "@/lib/format";
import { deleteRemoteListing, fetchListing, loadRemotePhotos, patchListing, photoSrc, saveKept } from "@/lib/remote";
import { requestArchive, saveErrorMessage } from "@/lib/save-listing";
import { WATCH_STATUSES, type ArchiveRecord, type ParsedListing, type WatchStatus } from "@/lib/types";

export function ListingScreen({ id }: { id: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<ArchiveRecord | null | undefined>(undefined);
  const [memo, setMemo] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showUnequipped, setShowUnequipped] = useState(false);
  const [draft, setDraft] = useState<ParsedListing | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchListing(id).then((found) => {
      if (cancelled) return;
      setRecord(found ?? null);
      setMemo(found?.memo ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!record) return;
    const handle = window.setTimeout(() => {
      void patchListing(record.id, { memo }).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [memo, record]);

  async function refresh(mode: "check" | "update") {
    if (!record) return;
    setBusy(mode === "check" ? "掲載を確認しています" : "内容を取り直しています");
    setMessage("");
    try {
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
      if (mode === "check") {
        const next = await patchListing(record.id, {
          availability: "live",
          lastCheckedAt: new Date().toISOString(),
        });
        setRecord(next.record);
        setMessage("まだ掲載されています。内容を取り直すと、価格や写真も更新できます。");
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
        <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground sm:px-6">読み込み中</main>
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

  const name = displayName(record);
  const photos = (record.savedPhotos ?? []).map((photo, index) => ({
    url: photoSrc(record.id, index),
    caption: photo.caption,
    category: photo.category,
  }));
  const equippedCount = record.equipment.reduce(
    (sum, group) => sum + group.items.filter((item) => item.equipped).length,
    0,
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/" className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:text-foreground">
          <ArrowLeft className="size-4" />
          保存した車
        </Link>

        <div className="mt-4 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="min-w-0">
            {draft ? (
              <PhotoPicker
                listing={draft}
                replacing={record.photoCount > 0}
                busy={busy}
                onKeep={(indexes) => void keepDraft(indexes)}
                onTextOnly={() => void keepDraft(null)}
                onCancel={() => setDraft(null)}
              />
            ) : photos.length > 0 ? (
              <PhotoGallery photos={photos} title={name} />
            ) : (
              <div className="bg-muted text-muted-foreground flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-xl border px-6 text-center">
                <p>{busy || "残す写真はまだ選んでいません"}</p>
                <Button disabled={Boolean(busy)} onClick={() => void refresh("update")}>
                  写真を選ぶ
                </Button>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {record.availability === "ended" ? (
                <Badge variant="destructive">掲載終了</Badge>
              ) : (
                <Badge variant="secondary">保存済み</Badge>
              )}
              {record.color && <Badge variant="outline">{record.color}</Badge>}
            </div>
            <p className="text-muted-foreground mt-4 text-sm">{[record.maker, record.model].filter(Boolean).join(" ")}</p>
            <h1 className="font-heading mt-1 text-3xl leading-tight sm:text-4xl">{name}</h1>
            <p className="mt-3 text-sm leading-6">{gradeLine(record)}</p>
            <p className="font-heading mt-5 text-4xl tracking-tight">{record.totalPrice || record.basePrice || "価格未記載"}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {record.totalPrice ? "支払総額（税込）" : "車両本体価格"}
              {record.priceYen ? ` / ${formatYen(record.priceYen)}` : ""}
              {record.expenseNote ? ` ${record.expenseNote}` : ""}
            </p>
            {record.basePrice && record.totalPrice && (
              <p className="text-muted-foreground mt-1 text-sm">車両本体価格 {record.basePrice}</p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {record.highlights.map((item) => (
                <div key={item.label} className="rounded-lg border bg-card px-3 py-2">
                  <dt className="text-muted-foreground text-[11px]">{item.label}</dt>
                  <dd className="mt-1 text-sm font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {WATCH_STATUSES.map((status) => (
                <Button
                  key={status.id}
                  size="sm"
                  variant={record.watchStatus === status.id ? "default" : "outline"}
                  onClick={() => {
                    const next = status.id as WatchStatus;
                    setRecord({ ...record, watchStatus: next });
                    void patchListing(record.id, { watchStatus: next });
                  }}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {record.qualityComment && (
          <p className="mt-8 rounded-xl border bg-card px-4 py-3 text-sm leading-7">{record.qualityComment}</p>
        )}

        <section className="mt-8">
          <h2 className="font-heading text-2xl">自分用のメモ</h2>
          <Textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="電話した日、気になった傷、比較したい点"
            className="mt-3 min-h-28 bg-card text-base"
          />
          <p className="text-muted-foreground mt-2 text-xs">入力するとアカウントに残ります。</p>
        </section>

        {record.sections.map((section) => (
          <section key={section.id} className="mt-10">
            <h2 className="font-heading text-2xl">{section.title}</h2>
            {section.columns.length > 0 ? (
              <div className="mt-3 min-w-0 overflow-x-auto rounded-xl border bg-card">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="bg-muted/70 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium" />
                      {section.columns.map((column) => (
                        <th key={column} className="px-3 py-2 font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.label} className="border-t">
                        <th className="px-3 py-2 align-top font-medium whitespace-nowrap">{row.label}</th>
                        {row.values.map((value, valueIndex) => (
                          <td key={`${row.label}-${valueIndex}`} className="px-3 py-2 align-top leading-6">
                            <CellValue value={value} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <dl className="mt-3 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
                {section.rows.map((row) => (
                  <div key={row.label} className="bg-card px-4 py-3">
                    <dt className="text-muted-foreground text-xs">{row.label}</dt>
                    <dd className="mt-1 text-sm leading-6">
                      <CellValue value={row.values.join(" / ")} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}

        {record.equipment.length > 0 && (
          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-heading text-2xl">装備 {equippedCount}点</h2>
              <Button variant="outline" size="sm" onClick={() => setShowUnequipped((value) => !value)}>
                {showUnequipped ? "付いているものだけ" : "付いていない装備も見る"}
              </Button>
            </div>
            <div className="mt-4 space-y-5">
              {record.equipment.map((group) => {
                const items = showUnequipped ? group.items : group.items.filter((item) => item.equipped);
                if (!items.length) return null;
                return (
                  <div key={group.category}>
                    <h3 className="text-sm font-medium">{group.category}</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {items.map((item) => (
                        <li
                          key={item.name}
                          className={`rounded-full border px-3 py-1 text-sm ${
                            item.equipped ? "bg-card" : "text-muted-foreground border-dashed"
                          }`}
                        >
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-10 rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="font-heading text-2xl">販売店</h2>
          <p className="mt-3 text-base font-medium">{record.shopName || "店名は保存されていません"}</p>
          {record.shopAddress && <p className="text-muted-foreground mt-1 text-sm">{record.shopAddress}</p>}
          {record.shopUrl && (
            <a
              href={record.shopUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4"
            >
              お店のページ
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </section>

        <section className="mt-8 flex flex-col gap-3 border-t pt-6">
          <p className="text-muted-foreground text-sm leading-6">
            {formatWhen(record.savedAt)} に保存
            {record.lastCheckedAt ? `。最終確認 ${formatWhen(record.lastCheckedAt)}` : ""}。
            写真 {record.photoCount}枚
            {record.photoTotal ? `（掲載にあった${record.photoTotal}枚から選択）` : ""}。
          </p>
          {message && <p className="text-sm leading-6">{message}</p>}
          {busy && (
            <p className="text-muted-foreground inline-flex items-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin" />
              {busy}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => void refresh("check")}>
              今も載っているか見る
            </Button>
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => void refresh("update")}>
              内容を取り直す
            </Button>
            <Button variant="outline" nativeButton={false} render={<a href={record.sourceUrl} target="_blank" rel="noreferrer" />}>
              元のページ
              <ExternalLink />
            </Button>
            <Button variant="outline" onClick={() => void exportOne()}>
              この一台を書き出す
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              削除
            </Button>
          </div>
          <p className="text-muted-foreground text-xs leading-5">
            気になる点: {factValue(record, "修復歴") || "修復歴は未記載"} / {factValue(record, "保証") || "保証は未記載"}
          </p>
        </section>
      </main>

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

function CellValue({ value }: { value: string }) {
  const muted = value === "－" || value === "-" || value === "−";
  if (value.length > 180) {
    return (
      <details>
        <summary className="cursor-pointer">{value.slice(0, 120)}…</summary>
        <p className="mt-2 leading-7">{value}</p>
      </details>
    );
  }
  return <span className={muted ? "text-muted-foreground" : undefined}>{value}</span>;
}
