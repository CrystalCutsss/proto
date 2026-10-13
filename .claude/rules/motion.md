---
paths:
  - "prototypes/**/*.{ts,tsx,js}"
  - "templates/**/*.{ts,tsx,js}"
  - "packages/motion/**"
---

# Motion (GSAP 3.15 through @proto/motion)

- Import GSAP from `@proto/motion` (`gsap`, `ScrollTrigger`), call `setupMotion()` once at startup: it registers
  plugins and the TUI eases.
- Durations: `duration.{fastest,fast,moderate,slow,slowest}` (seconds, from TUI tokens). Eases:
  `'ds-productive-{standard,entrance,exit}'` for UI feedback, `'ds-expressive-…'` for large moves. No ad-hoc
  numbers or `power*` eases unless the design specifies them.
- `reveal()` / `revealOnScroll()` already respect `prefers-reduced-motion`; custom animations must check
  `prefersReducedMotion()` or use `gsap.matchMedia()`.
- Sequences use timelines with the position parameter, not chained `delay`. ScrollTrigger only on top-level
  tweens/timelines. Animate transforms and `autoAlpha`, not layout properties.
- Clean up: kill tweens and ScrollTriggers when a screen unmounts (`gsap.context()`/`useGSAP` in React).
- Vendored references: skills `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-performance`, `gsap-react`.
