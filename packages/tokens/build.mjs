// Build design tokens with Style Dictionary (ADR-0005, ADR-0013).
//
// Source: the Figma Variables export synced from Proto/DS/tokens (design-system/source/tokens/*.tokens.json)
// plus src/proto.tokens.json (spacing, radii and border widths that TUI does not define yet).
// Output (dist/):
//   tokens.css   :root = Theme "Day" + Platform "Desktop"; [data-ds-theme="night"] and
//                [data-ds-platform="ios"|"android"] override only the tokens of their collection
//   tokens.js / tokens.d.ts  default values (Day, Desktop)
//   dtcg/*.tokens.json       the normalized DTCG 2025.10 trees, for review and other platforms (iOS later)
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import { buildVariants, readFigmaExport, unresolvedReferences } from './src/figma-import.js';

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, '../../design-system/source/tokens');
const dist = join(here, 'dist');
const proto = join(here, 'src/proto.tokens.json');

const exports = existsSync(sourceDir)
  ? readdirSync(sourceDir)
      .filter((f) => f.endsWith('.tokens.json'))
      .sort()
  : [];
if (exports.length === 0) {
  console.error(
    'tokens: design-system/source/tokens/*.tokens.json not found. Run the ds-sync workflow (ADR-0013).',
  );
  process.exit(1);
}
const vars = exports.flatMap((f) => readFigmaExport(JSON.parse(readFileSync(join(sourceDir, f), 'utf8'))));
const variants = buildVariants(vars);

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'dtcg'), { recursive: true });
for (const v of variants) {
  const missing = unresolvedReferences(v.tree);
  if (missing.length) {
    throw new Error(
      `tokens: unresolved references in ${v.id}: ${missing
        .slice(0, 10)
        .map((r) => `${r.from} → {${r.to}}`)
        .join(', ')}`,
    );
  }
  writeFileSync(join(dist, 'dtcg', `${v.id}.tokens.json`), `${JSON.stringify(v.tree, null, 2)}\n`);
}

// DTCG 2025.10 durations are objects ({ value, unit }); the built-in groups do not flatten them yet.
StyleDictionary.registerTransform({
  name: 'ds/duration',
  type: 'value',
  filter: (token) => (token.$type ?? token.type) === 'duration',
  transform: (token) => {
    const v = token.$value ?? token.value;
    return typeof v === 'object' && v !== null ? `${v.value}${v.unit}` : v;
  },
});
const groups = StyleDictionary.hooks.transformGroups;

/** @param {(typeof variants)[number]} variant */
async function buildVariant(variant) {
  const isDefault = variant.collection === null;
  const sd = new StyleDictionary({
    source: [join(dist, 'dtcg', `${variant.id}.tokens.json`), ...(isDefault ? [proto] : [])],
    // Variant files reference tokens defined only in the default tree; they resolve from :root at runtime.
    include: isDefault ? [] : [proto],
    usesDtcg: true,
    log: { verbosity: 'silent', warnings: isDefault ? 'error' : 'disabled' },
    platforms: {
      css: {
        transforms: [...groups.css, 'ds/duration'],
        prefix: 'ds',
        buildPath: `${dist}/`,
        files: [
          {
            destination: `css/${variant.id}.css`,
            format: 'css/variables',
            filter: isDefault
              ? undefined
              : (t) => t.$extensions?.['proto.figma']?.collection === variant.collection,
            options: { outputReferences: true, selector: variant.selector, showFileHeader: false },
          },
        ],
      },
      ...(isDefault
        ? {
            js: {
              transforms: [...groups.js, 'ds/duration'],
              buildPath: `${dist}/`,
              files: [
                { destination: 'tokens.js', format: 'javascript/es6' },
                { destination: 'tokens.d.ts', format: 'typescript/es6-declarations' },
              ],
            },
          }
        : {}),
    },
  });
  await sd.buildAllPlatforms();
  return readFileSync(join(dist, 'css', `${variant.id}.css`), 'utf8');
}

const css = [];
// Descriptions stay in dtcg/*.json and tokens.d.ts; the stylesheet ships without comments.
for (const v of variants)
  css.push((await buildVariant(v)).replace(/ *\/\*\*[\s\S]*?\*\//g, '').replace(/[ \t]+$/gm, ''));
writeFileSync(
  join(dist, 'tokens.css'),
  `/* Generated from the TUI Figma Variables export (${exports.join(', ')}). Do not edit. */\n\n${css.join('\n')}`,
);
rmSync(join(dist, 'css'), { recursive: true, force: true });
const count = (css[0]?.match(/--ds-/g) ?? []).length;
console.log(
  `tokens: ${vars.length} Figma variables → ${count} CSS variables; variants: ${variants.map((v) => v.id).join(', ')}`,
);
