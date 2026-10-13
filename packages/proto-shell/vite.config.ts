// Builds two stable, unhashed files served from /_shell/: loader.js (tiny, injected into every version,
// copied verbatim) and shell.js (the panel, loaded lazily by the loader). Unhashed on purpose: frozen
// versions reference /_shell/loader.js forever, so shell updates reach every version without a rebuild
// (ADR-0011).
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/_shell/',
  plugins: [
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
