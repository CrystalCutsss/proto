// Build design tokens with Style Dictionary (ADR-0005).
// Source: design-system/tokens/**/*.tokens.json once DS is synced (Phase 2b);
// until then the synthetic DTCG fixture in ./fixtures is used.
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';

const here = dirname(fileURLToPath(import.meta.url));
const dsTokens = join(here, '../../design-system/tokens');
const useDs = existsSync(dsTokens) && readdirSync(dsTokens).some((f) => f.endsWith('.tokens.json'));
const source = useDs ? [join(dsTokens, '**/*.tokens.json')] : [join(here, 'fixtures/**/*.tokens.json')];

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

const sd = new StyleDictionary({
  source,
  usesDtcg: true,
  log: { verbosity: 'default', warnings: 'error' },
  platforms: {
    css: {
      transforms: [...groups.css, 'ds/duration'],
      prefix: 'ds',
      buildPath: join(here, 'dist/'),
      files: [{ destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true } }],
    },
    js: {
      transforms: [...groups.js, 'ds/duration'],
      buildPath: join(here, 'dist/'),
      files: [
        { destination: 'tokens.js', format: 'javascript/es6' },
        { destination: 'tokens.d.ts', format: 'typescript/es6-declarations' },
      ],
    },
  },
});

await sd.cleanAllPlatforms();
await sd.buildAllPlatforms();
console.log(
  `tokens: built from ${useDs ? 'design-system/tokens' : 'fixtures (synthetic, DS not synced yet)'}`,
);
