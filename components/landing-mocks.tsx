import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { SpecChip } from "@/components/spec-chip";
import { SOURCE_BADGE_CLASS } from "@/components/source-badge";
import { SOURCE_LABEL } from "@/lib/sites";

const ORANGE = "#E4682C";

// 使い方の画面例。実際の車カードと同じデザインにそろえたサンプル（写真はゆうがさんのGT-R）
function Phone({ children, label, tone = "white" }: { children: React.ReactNode; label: string; tone?: "white" | "line" }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto mt-4 w-full max-w-[250px] rounded-[26px] p-1.5"
      style={{ background: "#1C1917" }}
    >
      <div className="overflow-hidden rounded-[20px] text-left" style={{ background: tone === "line" ? "#E7F6EC" : "#F7F7F7" }}>
        {children}
      </div>
    </div>
  );
}

function Photo({ gray = false }: { gray?: boolean }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F2F2F2]">
      <Image src="/gtr-card.jpg" alt="" fill sizes="250px" className={`object-cover ${gray ? "grayscale" : ""}`} />
    </div>
  );
}

function Price({ size = 22 }: { size?: number }) {
  return (
    <p className="flex items-baseline gap-1 leading-none">
      <span className="text-[10px] font-bold" style={{ color: "#666666" }}>支払総額</span>
      <span className="font-extrabold tabular-nums" style={{ color: ORANGE, fontSize: size }}>1,361.4</span>
      <span className="text-[11px] font-bold">万円</span>
    </p>
  );
}

function Badge() {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] leading-none font-bold ${SOURCE_BADGE_CLASS.kabaha}`}>
      {SOURCE_LABEL.kabaha}
    </span>
  );
}

// 01 送る
export function MockSend() {
  return (
    <Phone label="LINEの「のこす」にURLを送る画面（サンプル）" tone="line">
      <div className="flex flex-col">
        <div className="px-3 py-2 text-[11px] font-bold text-white" style={{ background: "#06C755" }}>のこす</div>
        <div className="flex flex-col gap-2 p-2.5">
          <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-white px-2.5 py-2 text-[10px] leading-4 break-all" style={{ color: "#1C1917" }}>
            https://www.car-byebuy.com/Trade/Cars/Details/…
          </div>
          <div className="overflow-hidden rounded-xl rounded-tl-sm bg-white">
            <Photo />
            <div className="border-t-2 px-2.5 py-2" style={{ borderColor: ORANGE }}>
              <p className="text-[10px] font-bold" style={{ color: ORANGE }}>保存しました</p>
              <p className="text-[12px] leading-tight font-bold">日産 GT-R ブラックエディション</p>
              <p className="mt-1 text-[10px]">
                <span className="font-extrabold" style={{ color: ORANGE }}>1,361.4</span>万円 ・ <span className="font-bold text-live">掲載中</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

// 02 読み取る
export function MockDetail() {
  return (
    <Phone label="読み取った内容の画面（サンプル）">
      <div className="bg-white">
        <Photo />
        <div className="border-t-2 p-2.5" style={{ borderColor: ORANGE }}>
          <p className="text-[10px] font-medium" style={{ color: "#666666" }}>日産</p>
          <p className="text-[14px] leading-snug font-bold">GT-R ブラックエディション</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <Price />
            <p className="text-[10px]" style={{ color: "#666666" }}>車体価格 <span className="font-medium text-foreground">1,350万円</span></p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <SpecChip label="年式" value="2016年" />
            <SpecChip label="走行" value="7.4万km" />
          </div>
          <p className="mt-2 text-[10px] font-bold">装備</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {["ナビ", "ETC", "スマートキー", "本革"].map((tag) => (
              <span key={tag} className="rounded-full border bg-white px-2 py-0.5 text-[9px]">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </Phone>
  );
}

function MiniCard({ ended }: { ended: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="relative w-[40%] shrink-0 self-stretch bg-[#F2F2F2]">
        <Image src="/gtr-card.jpg" alt="" fill sizes="140px" className={`object-cover ${ended ? "grayscale" : ""}`} />
      </div>
      <div className="min-w-0 flex-1 border-l-2 p-2.5" style={{ borderColor: ORANGE }}>
        <p className="text-[10px] font-medium" style={{ color: "#666666" }}>日産</p>
        <p className="text-[13px] leading-snug font-bold">GT-R ブラックエディション</p>
        <div className="mt-1"><Price size={20} /></div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px]">
          <Badge />
          <span className={ended ? "font-bold text-black" : "font-bold text-live"}>{ended ? "掲載終了" : "掲載中"}</span>
        </p>
      </div>
    </div>
  );
}

// 03 残る: 掲載中と掲載終了を並べて、終わっても残ることを見せる
export function MockList() {
  return (
    <div role="img" aria-label="掲載中の車と、掲載が終わっても残る車（サンプル）" className="mt-4">
      <MiniCard ended={false} />
      <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold" style={{ color: "#9C3D12" }}>
        <ArrowDown className="size-3.5" aria-hidden />
        売約・掲載終了
      </div>
      <MiniCard ended />
      <p className="mt-2 rounded-xl px-3 py-2 text-center text-[12px] leading-5 font-bold" style={{ background: "#FFFFFF", color: ORANGE, border: "1px solid #F0C8AE" }}>
        写真もメモも残ります
        <span className="block text-[10px] font-normal" style={{ color: "#6B6560" }}>メモ「電話した。試乗OK」もそのまま</span>
      </p>
    </div>
  );
}
