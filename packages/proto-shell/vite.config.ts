// Builds stable, unhashed entry files served from /_shell/ (ADR-0011, ADR-0020):
//   loader.js   — tiny, injected into every version, copied verbatim;
//   shell.js    — the scenario/version menu of an installed web app, loaded lazily by the loader;
//   viewer.html — the viewer served at /p/<slug>/ (device mockup and bottom menu), with viewer.js.
// Unhashed on purpose: frozen versions reference /_shell/loader.js forever, so updates reach every version
// without a rebuild.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pickVariables, usedVariables } from '@proto/tokens/pick';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);

/** Stylesheets rendered inside the shell's Shadow DOM: their tokens go into virtual:shell-tokens. */
const SHADOW_CSS = [
  new URL('./src/shell.css', import.meta.url),
  new URL('./src/menu.css', import.meta.url),
  require.resolve('@proto/ui/segmented.css'),
];

/** virtual:shell-tokens — only the tokens the shell uses (and what they reference), not all ~1600. */
const shellTokens = (): Plugin => ({
  name: 'proto:shell-tokens',
  resolveId: (id) => (id === 'virtual:shell-tokens' ? '\0virtual:shell-tokens' : null),
  load(id) {
    if (id !== '\0virtual:shell-tokens') return null;
    const tokensFile = require.resolve('@proto/tokens/tokens.css');
    this.addWatchFile(tokensFile);
    const used = new Set(SHADOW_CSS.flatMap((f) => [...usedVariables(readFileSync(f, 'utf8'))]));
    return `export default ${JSON.stringify(pickVariables(readFileSync(tokensFile, 'utf8'), used))};`;
  },
});

export default defineConfig({
  base: '/_shell/',
  plugins: [
    shellTokens(),
    {
      name: 'proto:shell-loader',
      generateBundle() {
        const source = readFileSync(new URL('./src/loader.js', import.meta.url), 'utf8');
        this.emitFile({ type: 'asset', fileName: 'loader.js', source });
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: { shell: 'src/shell.ts', viewer: 'viewer.html' },
      preserveEntrySignatures: 'strict',
      output: { format: 'es', entryFileNames: '[name].js', chunkFileNames: '[name].js' },
    },
  },
});
