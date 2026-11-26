import type { ComponentPropsWithoutRef } from "react";

type SpinnerProps = ComponentPropsWithoutRef<"span"> & {
  /** 見た目の大きさ（px。標準 16） */
  size?: number;
  /** 読み上げ用の短い説明（付けると aria-hidden は外れます） */
  label?: string;
};

/**
 * 保存中などに回る小さな円。CSS だけなので軽いです。
 * 「視差効果を減らす」の人には止まります（円だけ見えます）。
 *
 * <button disabled={saving}>{saving ? <Spinner label="保存しています" /> : "のこす"}</button>
 *
 * すでにアイコンがある時は、クラスを付けるだけでも同じ動きになります：
 * <LoaderCircle className="motion-spin size-4" aria-hidden />
 */
export function Spinner({ size = 16, label, className, style, ...rest }: SpinnerProps) {
  return (
    <span
      {...rest}
      className={className ? `motion-spin ${className}` : "motion-spin"}
      style={{ width: size, height: size, ...style }}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
