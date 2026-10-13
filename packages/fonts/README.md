# @proto/fonts

TUI web fonts (ADR-0013). Source: `design-system/source/fonts/**`, the OTF/TTF files from Proto/DS/fonts that `ds-sync` copies into the repository.

- **Build:**
  - reads family, weight, width and style from each font file (`name`, `OS/2` and `fvar` tables); width becomes `font-stretch`, so condensed cuts (T-Sans Condensed: `font-stretch: 75%`) sit next to the regular ones in one family;
  - converts the file to WOFF2 with `wawoff2`;
  - writes `dist/fonts.css` (`@font-face`) and `dist/fonts.json` (report).
- **Use:** `@proto/ui` imports `fonts.css`, so prototypes and the hub get the fonts through `ui.css`.
- **Exclusions:**
  - SF Pro is never embedded: Apple's license forbids it, and `config/drive.json` → `sync.copyExclude` keeps it out of the repository. Its tokens fall back to `-apple-system`.
  - JetBrains Mono and Open Runde are referenced by tokens but not needed (owner's decision): they use system fallbacks, and the build does not warn about them.
  - A variable font replaces static files of the same family. With a `wdth` axis it also replaces static width families such as `Roboto Condensed` and `Roboto SemiCondensed`.
- **Without source fonts** the build still succeeds with an empty `fonts.css`. It warns about token families that have no web font.
