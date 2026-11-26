"use client";

import { useEffect } from "react";

/** 画面が動き出した後（hydration 後）に html へ motion-ready を付けます。MotionBoot が中で使います。 */
export function MotionReady() {
  useEffect(() => {
    document.documentElement.classList.add("motion-js", "motion-ready");
  }, []);
  return null;
}
