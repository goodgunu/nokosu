// 共通モーション。使い方は README.md を見てください。
// CSS（motion.css）は app/layout.tsx で 1 回だけ読み込んでいます。
export {
  MOTION_DURATION,
  MOTION_EASING,
  MOTION_STAGGER,
  MOTION_DISTANCE,
  MOTION_SCALE,
  MOTION_IN_VIEW,
  MOTION_VARS,
  staggerDelay,
} from "./tokens";
export { prefersReducedMotion, useReducedMotion } from "./reduced-motion";
export { useInView, useReveal, observeInView, type UseInViewOptions, type RevealVariant } from "./use-in-view";
export { Reveal, Stagger } from "./reveal";
export { NAV_FORWARD, NAV_BACK, vtName, staggerStyle, motionDelayStyle } from "./shared";
export { Collapse, useCollapse } from "./collapse";
export { usePop } from "./pop";
export {
  supportsViewTransitions,
  startViewTransition,
  navigateWithTransition,
  SharedElement,
} from "./view-transition";
export { MotionBoot } from "./motion-boot";
export { MotionReady } from "./motion-ready";
