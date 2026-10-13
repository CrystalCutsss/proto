// Builds two stable, unhashed files served from /_shell/: loader.js (tiny, injected into every version,
// copied verbatim) and shell.js (the panel, loaded lazily by the loader). Unhashed on purpose: frozen
// versions reference /_shell/loader.js forever, so shell updates reach every version without a rebuild
// (ADR-0011).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pickVariables, usedVariables } from '@proto/tokens/pick';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);

/** virtual:shell-tokens — only the tokens shell.css uses (and what they reference), not all ~1600. */
const shellTokens = (): Plugin => ({
  name: 'proto:shell-tokens',
  resolveId: (id) => (id === 'virtual:shell-tokens' ? '\0virtual:shell-tokens' : null),
  load(id) {
    if (id !== '\0virtual:shell-tokens') return null;
    const tokensFile = require.resolve('@proto/tokens/tokens.css');
    const shellCss = new URL('./src/shell.css', import.meta.url);
    this.addWatchFile(tokensFile);
    const css = pickVariables(
      readFileSync(tokensFile, 'utf8'),
      usedVariables(readFileSync(shellCss, 'utf8')),
    );
    return `export default ${JSON.stringify(css)};`;
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
    rolldownOptions: {
      input: { shell: 'src/shell.ts' },
      preserveEntrySignatures: 'strict',
      output: { format: 'es', entryFileNames: '[name].js', chunkFileNames: '[name].js' },
    },
  },
});
