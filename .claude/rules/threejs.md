---
paths:
  - "prototypes/**/*.{ts,tsx}"
  - "templates/three-gsap/**"
  - "templates/react-r3f/**"
  - "packages/three-kit/**"
---

# three.js 0.186 / R3F 9.8 conventions

- Versions are pinned: three 0.186.1, @react-three/fiber 9.8.1, drei 10.7.9. Do not upgrade inside a prototype;
  postprocessing caps three at <0.187, so upgrade them together in a separate change.
- Vanilla: `createStage()` from `@proto/three-kit` (renderer, resize, DPR cap 2, pause when hidden). Use its
  `onFrame(dt, t)` loop; never start a second `requestAnimationFrame` loop.
- Load models with `createGltfLoader(renderer)`: Draco, KTX2 and Meshopt decoders are served from the version
  (`decoders/`), never from gstatic/jsdelivr/unpkg. In R3F, point drei's loaders at the same local paths.
- Current APIs: `Timer` instead of new `Clock` instances, `HDRLoader` instead of `RGBELoader`, addons from
  `three/addons/…`. WebGL by default; WebGPU only when the spec asks for it.
- Colours for materials come from tokens: read `--ds-*` via `getComputedStyle` (see the three-gsap template).
- Free GPU memory on teardown with `disposeObject()`; cached loader assets have one owner.
- Performance check: `?perf=1` enables the stats-gl overlay (`perfMonitor`); watch draw calls in
  `renderer.info`. Budget: 60 fps on a mid-range laptop.
- Vendored references: skills `r3f-fundamentals`, `r3f-loaders`, `r3f-animation`, `r3f-shaders`,
  `r3f-postprocessing`, `pmndrs-docs`.
