// Vite plugin: copy three.js decoders (Draco, Basis) into <version>/decoders/ so prototypes never
// load them from a CDN (ADR-0005). Paths are stable (no hash): decoders change only with three itself.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/** @returns {import('vite').Plugin} */
export function copyDecoders() {
  // three does not export ./package.json: walk up from its entry file to the package root.
  let root = dirname(require.resolve('three'));
  while (!existsSync(join(root, 'package.json'))) root = dirname(root);
  const libs = join(root, 'examples/jsm/libs');
  const sets = { draco: join(libs, 'draco/gltf'), basis: join(libs, 'basis') };
  return {
    name: 'proto:three-decoders',
    apply: 'build',
    generateBundle() {
      for (const [name, dir] of Object.entries(sets)) {
        for (const file of readdirSync(dir)) {
          if (!/\.(js|wasm)$/.test(file)) continue;
          this.emitFile({
            type: 'asset',
            fileName: `decoders/${name}/${file}`,
            source: readFileSync(join(dir, file)),
          });
        }
      }
    },
  };
}
