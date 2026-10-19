import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { SpecChip } from "@/components/spec-chip";
import { SOURCE_BADGE_CLASS } from "@/components/source-badge";
import { SOURCE_LABEL } from "@/lib/sites";

const ORANGE = "#E4682C";

function Price({ size = 22 }: { size?: number }) {
  return (
    <p className="flex items-baseline gap-1 leading-none">
      <span className="text-[10px] font-bold" style={{ color: "#666666" }}>支払総額</span>
      <span className="font-extrabold tabular-nums" style={{ color: ORANGE, fontSize: size }}>238.6</span>
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

export function MiniCard({ ended }: { ended: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="relative w-[40%] shrink-0 self-stretch bg-[#F2F2F2]">
        <Image src="/86-card-2.jpg" alt="" fill sizes="140px" className={`object-cover ${ended ? "grayscale" : ""}`} style={{ objectPosition: "20% 50%" }} />
      </div>
      <div className="min-w-0 flex-1 border-l-2 p-2.5" style={{ borderColor: ORANGE }}>
        <p className="text-[10px] font-medium" style={{ color: "#666666" }}>トヨタ</p>
        <p className="text-[13px] leading-snug font-bold">86 GT</p>
        <div className="mt-1"><Price size={20} /></div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px]">
          <Badge />
          <span className={ended ? "font-bold text-black" : "font-bold text-live"}>{ended ? "掲載終了" : "掲載中"}</span>
          <span className="text-muted-foreground"> ・ 検討中</span>
        </p>
      </div>
    </div>
  );
}

// 掲載中と掲載終了を並べて、終わっても残ることを見せる
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

// アプリの一覧（library.tsx）の実カードと同じ構成のサンプル
export function AppCard() {
  return (
    <div className="border-border min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden">
        <Image src="/86-card-2.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 300px" className="object-cover" style={{ objectPosition: "30% 50%" }} />
      </div>
      <div className="min-w-0 border-t-2 p-3 pb-3.5" style={{ borderColor: ORANGE }}>
        <p className="text-muted-foreground text-xs font-medium tracking-wide">トヨタ</p>
        <h3 className="text-[17px] leading-snug font-bold">86 GT</h3>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="flex items-baseline gap-1 leading-none whitespace-nowrap">
            <span className="text-muted-foreground text-[11px] font-bold">支払総額</span>
            <span className="text-[26px] font-extrabold tabular-nums" style={{ color: ORANGE }}>238.6</span>
            <span className="text-sm font-bold">万円</span>
          </p>
          <p className="text-muted-foreground text-[15px] whitespace-nowrap">
            車体価格 <span className="text-foreground font-medium tabular-nums">229万円</span>
          </p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <SpecChip label="年式" value="2017年" />
          <SpecChip label="走行" value="5.2万km" />
          <SpecChip label="色" value="ブラック" />
        </div>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
          <span className={`mr-1 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] leading-none font-bold ${SOURCE_BADGE_CLASS.kabaha}`}>
            {SOURCE_LABEL.kabaha}
          </span>
          <span className="text-live font-bold">掲載中</span>
          <span className="text-muted-foreground"> ・ 検討中 ・ 愛知県</span>
        </p>
      </div>
    </div>
  );
}
