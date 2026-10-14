# visual-diff

Pixel diff of two PNG screenshots for visual QA (Phase 6, ADR-0016): a rendered prototype screen against
its design reference (Figma render in `design-input/`) or against another version.

```
pnpm qa:diff design-input/figma/01-offer.png qa/screens/offer.png --crop-ref 4 --out qa/diff/offer.png
```

- Output: share of differing pixels, the five most different 32 px horizontal bands (where to look) and a
  diff image (differences in red over a faded copy of the reference).
- `--crop-ref N` trims a frame from the reference (Figma device frames here have a 4 px border).
- `--offset-ref x,y` / `--offset-actual x,y` shift the compared area, e.g. to skip a header.
- `--max-ratio 0.05` makes the command fail above 5 %; use it for regressions between versions of the same
  prototype (same fonts, same renderer), not against Figma.
- Against Figma the number is a pointer, not a verdict: SF Pro is not embedded, so Chromium on Linux
  renders text with the fallback font and every text line differs. Read the diff image and the bands.

Libraries: `pixelmatch` 7.2.0 (ISC) and `pngjs` 7.0.0 (MIT), dev dependencies of the root package.
