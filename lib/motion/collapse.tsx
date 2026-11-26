"use client";

import { useCallback, useId, useState, type ElementType, type ReactNode } from "react";

type CollapseProps = {
  /** 開いているか */
  open: boolean;
  /** どのタグで描くか（標準 "div"） */
  as?: ElementType;
  id?: string;
  /** 外側の箱のクラス（padding はここではなく中身の子要素に付けてください） */
  className?: string;
  /** 中身の箱のクラス（padding は付けないでください） */
  innerClassName?: string;
  children?: ReactNode;
};

/**
 * 高さがなめらかに伸び縮みする開閉の箱（grid-template-rows 0fr → 1fr）。
 * 閉じている時も中身は DOM に残ります（inert でタップやフォーカスはできません）。
 * 中身は小さめに保ってください。大きいとスマホでカクつきます。
 */
export function Collapse({ open, as, id, className, innerClassName, children }: CollapseProps) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      id={id}
      className={className ? `motion-collapse ${className}` : "motion-collapse"}
      data-open={open ? "" : undefined}
      aria-hidden={open ? undefined : true}
    >
      <div className={innerClassName ? `motion-collapse-inner ${innerClassName}` : "motion-collapse-inner"} inert={!open}>
        {children}
      </div>
    </Tag>
  );
}

/**
 * 開閉ボタンと <Collapse> をつなぐ小さなフック。
 * const c = useCollapse();
 * <button {...c.buttonProps}>並べ替え</button>
 * <Collapse {...c.collapseProps}>…</Collapse>
 */
export function useCollapse(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return {
    open,
    setOpen,
    toggle,
    buttonProps: {
      type: "button" as const,
      "aria-expanded": open,
      "aria-controls": id,
      onClick: toggle,
    },
    collapseProps: { id, open },
  };
}
