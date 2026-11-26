"use client";

import { useCallback, type Ref, type RefObject } from "react";

/** ref（関数でもオブジェクトでも）に要素を入れます */
export function assignRef<T>(target: Ref<T> | undefined, node: T | null): void {
  if (typeof target === "function") target(node);
  else if (target && typeof target === "object") Reflect.set(target, "current", node);
}

/** 自分の ref と、外から渡された ref の両方に同じ要素を入れます */
export function useMergedRef<T>(innerRef: RefObject<T | null>, outerRef: Ref<T> | undefined): (node: T | null) => void {
  return useCallback(
    (node: T | null) => {
      assignRef(innerRef, node);
      assignRef(outerRef, node);
    },
    [innerRef, outerRef],
  );
}
