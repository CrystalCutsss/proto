// Web fonts of the TUI design system (ADR-0013).
// Source: design-system/source/fonts/** (OTF/TTF from Proto/DS/fonts, copied by ds-sync).
// Output: dist/fonts/*.woff2, dist/fonts.css (@font-face) and dist/fonts.json (what was built).
// Without source fonts the build still succeeds with an empty fonts.css: font tokens then fall back to
// Inter and system fonts.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import wawoff2 from 'wawoff2';
import { readFontInfo } from './src/sfnt.js';

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, '../../design-system/source/fonts');
const dist = join(here, 'dist');

/**
 * CSS family names must match the font-family tokens (Primitive/Font/Font Family/*). Fonts whose
 * internal family name differs are mapped here.
 */
const FAMILY_ALIASES = { 'Neue Haas Unica W1G Medium': 'Neue Haas Unica W1G' };
/**
 * Token font families that are deliberately not shipped as web fonts: their system fallbacks are used.
 * The owner decided JetBrains Mono and Open Runde are not needed for prototypes.
 */
const NOT_SHIPPED = [/^SF Pro/, /^JetBrains Mono$/, /^Open Runde$/];
/** Apple's SF Pro license forbids web embedding; Apple devices already render it as -apple-system. */
const EXCLUDE = [/^SF[- ]Pro/i, /^\./];

/** @param {string} dir @returns {string[]} */
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'fonts'), { recursive: true });

const files = existsSync(sourceDir)
  ? walk(sourceDir).filter((f) => /\.(otf|ttf)$/i.test(f) && !EXCLUDE.some((re) => re.test(basename(f))))
  : [];
// A variable font replaces static files of its family (Roboto/static/*). With a width axis it also
// replaces the static width families that Google Fonts ships next to it ("Roboto Condensed", "Roboto
// SemiCondensed").
const infos = files.map((file) => ({ file, ...readFontInfo(readFileSync(file)) }));
const variables = infos.filter((i) => i.variable);
const coveredBy = (/** @type {(typeof infos)[number]} */ i) =>
  variables.some((v) => v.family === i.family || ('wdth' in v.axes && i.family.startsWith(`${v.family} `)));
const selected = infos.filter((i) => i.variable || !coveredBy(i));

/** @param {(typeof infos)[number]} info */
const range = (info) => {
  const axis = (/** @type {string} */ tag, /** @type {string} */ unit, /** @type {number} */ fixed) =>
    info.axes[tag] ? `${info.axes[tag].min}${unit} ${info.axes[tag].max}${unit}` : `${fixed}${unit}`;
  return { weight: axis('wght', '', info.weight), stretch: axis('wdth', '%', info.width) };
};

const faces = [];
const report = [];
const seen = new Set();
for (const info of selected) {
  const family = FAMILY_ALIASES[info.family] ?? info.family;
  const style = info.italic ? 'italic' : 'normal';
  const { weight, stretch } = range(info);
  const key = `${family}|${weight}|${stretch}|${style}`;
  if (!family || seen.has(key)) continue;
  seen.add(key);
  const out = `${basename(info.file, extname(info.file)).replace(/[^A-Za-z0-9-]+/g, '-')}.woff2`;
  const woff2 = Buffer.from(await wawoff2.compress(readFileSync(info.file)));
  writeFileSync(join(dist, 'fonts', out), woff2);
  faces.push(
    [
      '@font-face {',
      `  font-family: ${JSON.stringify(family)};`,
      `  src: url('./fonts/${out}') format('woff2');`,
      `  font-weight: ${weight};`,
      ...(stretch === '100%' ? [] : [`  font-stretch: ${stretch};`]),
      `  font-style: ${style};`,
      '  font-display: swap;',
      '}',
    ].join('\n'),
  );
  report.push({
    family,
    weight,
    stretch,
    style,
    file: relative(sourceDir, info.file),
    woff2: out,
    bytes: woff2.length,
  });
}

writeFileSync(
  join(dist, 'fonts.css'),
  faces.length
    ? `/* Generated from design-system/source/fonts. Do not edit. */\n${faces.join('\n\n')}\n`
    : '/* No DS fonts synced yet (design-system/source/fonts): font tokens fall back to Inter and system fonts. */\n',
);
writeFileSync(join(dist, 'fonts.json'), `${JSON.stringify(report, null, 2)}\n`);
const families = [...new Set(report.map((r) => r.family))];

// Font families the TUI tokens ask for (Figma export, FONT_FAMILY scope) that have no web font here.
const tokensDir = join(here, '../../design-system/source/tokens');
const wanted = new Set();
if (existsSync(tokensDir)) {
  /** @param {any} node */
  const collect = (node) => {
    if (!node || typeof node !== 'object') return;
    const ext = node.$extensions && Object.values(node.$extensions).find((e) => e?.scopes);
    if ('$value' in node && ext?.scopes?.includes('FONT_FAMILY')) {
      for (const v of Object.values(ext.valuesByMode ?? {}))
        if (typeof v === 'string' && !v.startsWith('{')) wanted.add(v);
      return;
    }
    for (const v of Object.values(node)) collect(v);
  };
  for (const f of readdirSync(tokensDir).filter((n) => n.endsWith('.tokens.json')))
    collect(JSON.parse(readFileSync(join(tokensDir, f), 'utf8')));
}
const missing = [...wanted]
  .filter((f) => !families.includes(f) && !NOT_SHIPPED.some((re) => re.test(f)))
  .sort();
if (files.length && missing.length) {
  console.warn(`fonts: no web font for token families: ${missing.join(', ')} (system fallbacks are used)`);
}
console.log(
  `fonts: ${report.length} faces${families.length ? ` (${families.join(', ')})` : ''}${files.length ? '' : ' — no source fonts, empty fonts.css'}`,
);
