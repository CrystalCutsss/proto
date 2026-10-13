// Motion presets: durations and easings come from design tokens, never from literals in prototypes.
import {
  MotionDurationBase,
  MotionDurationFast,
  MotionDurationSlow,
  MotionEasingEmphasized,
  MotionEasingStandard,
} from '@proto/tokens';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** "240ms" | "0.24s" → seconds. */
export function toSeconds(value: string): number {
  const m = /^(-?\d*\.?\d+)(ms|s)$/.exec(value.trim());
  if (!m) throw new Error(`motion: unsupported duration "${value}"`);
  const n = Number(m[1]);
  return m[2] === 'ms' ? n / 1000 : n;
}

/** [x1, y1, x2, y2] → SVG path understood by CustomEase. */
export function bezierPath([x1, y1, x2, y2]: readonly number[]): string {
  return `M0,0 C${x1},${y1} ${x2},${y2} 1,1`;
}

export const duration = {
  fast: toSeconds(MotionDurationFast),
  base: toSeconds(MotionDurationBase),
  slow: toSeconds(MotionDurationSlow),
} as const;

export const ease = { standard: 'ds-standard', emphasized: 'ds-emphasized' } as const;

export function prefersReducedMotion(win: Window = window): boolean {
  return win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

let registered = false;

/** Register plugins, token easings and defaults. Call once at startup. */
export function setupMotion(options: { scroll?: boolean } = {}) {
  if (registered) return gsap;
  gsap.registerPlugin(CustomEase, ...(options.scroll ? [ScrollTrigger] : []));
  CustomEase.create(ease.standard, bezierPath(MotionEasingStandard));
  CustomEase.create(ease.emphasized, bezierPath(MotionEasingEmphasized));
  gsap.defaults({ duration: duration.base, ease: ease.standard });
  // Reduced motion: animations jump to their end state.
  if (prefersReducedMotion()) gsap.globalTimeline.timeScale(1000);
  registered = true;
  return gsap;
}

/** Fade and slide elements in, staggered. */
export function reveal(targets: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  return gsap.from(targets, { autoAlpha: 0, y: 16, stagger: 0.06, duration: duration.slow, ...vars });
}

/** Reveal elements when they scroll into view (requires setupMotion({ scroll: true })). */
export function revealOnScroll(targets: gsap.DOMTarget, vars: gsap.TweenVars = {}) {
  return gsap.utils
    .toArray<Element>(targets)
    .map((el) =>
      reveal(el, { scrollTrigger: { trigger: el, start: 'top 85%', once: true }, stagger: 0, ...vars }),
    );
}

export { gsap, ScrollTrigger };
