import { SOURCE_LABEL, sourceOf, type Source } from "@/lib/sites";

// サイトごとの色（白背景で読めるコントラスト）。カーセンサー=オレンジ、グーネット=青、カババ=緑
export const SOURCE_BADGE_CLASS: Record<Source, string> = {
  carsensor: "border-[#E4682C]/60 bg-[#E4682C]/10 text-[#A8470F]",
  goonet: "border-[#1D5FD1]/60 bg-[#1D5FD1]/10 text-[#164AA3]",
  kabaha: "border-[#1E8E4A]/60 bg-[#1E8E4A]/10 text-[#13652F]",
};

export function SourceBadge({ record }: { record: { source?: string; id?: string } }) {
  const source = sourceOf(record);
  return (
    <span
      data-source={source}
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${SOURCE_BADGE_CLASS[source]}`}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}
