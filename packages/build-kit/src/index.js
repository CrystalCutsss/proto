// Vite preset for one prototype version (ADR-0009, ADR-0011, ADR-0012).
//
//   // prototypes/<slug>/versions/<vN>/vite.config.ts
//   import { defineVersionConfig } from '@proto/build-kit';
//   export default defineVersionConfig(import.meta.dirname);
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { buildRegistry, serializeRegistry, SLUG_RE, VERSION_RE } from '@proto/registry';
import { optimize } from 'svgo';

/** Hosts that prototypes must not load from: the site is password-protected and must work in isolation. */
export const FORBIDDEN_CDN =
  /(?:https?:)?\/\/(?:[\w-]+\.)*(?:gstatic\.com|jsdelivr\.net|unpkg\.com|githack\.com|cdnjs\.cloudflare\.com|esm\.sh|skypack\.dev)\//;

/**
 * Derive slug and version from prototypes/<slug>/versions/<vN>.
 * @param {string} versionDir
 */
export function versionContext(versionDir) {
  const dir = resolve(versionDir);
  const version = basename(dir);
  const versionsDir = dirname(dir);
  const protoDir = dirname(versionsDir);
  const slug = basename(protoDir);
  const repoRoot = dirname(dirname(protoDir));
  if (basename(versionsDir) !== 'versions' || basename(dirname(protoDir)) !== 'prototypes') {
    throw new Error(`build-kit: ${dir} is not prototypes/<slug>/versions/<vN>`);
  }
  if (!SLUG_RE.test(slug) || !VERSION_RE.test(version)) {
    throw new Error(`build-kit: invalid slug or version in ${dir}`);
  }
  return { slug, version, repoRoot, base: `/p/${slug}/${version}/` };
}

/**
 * Tags injected into index.html: context for the shell and a tiny loader that lazily pulls the shell
 * from /_shell/ at runtime. The shell is never bundled into the version (ADR-0011).
 * @param {{ slug: string, version: string }} ctx
 * @returns {import('vite').HtmlTagDescriptor[]}
 */
export function shellTags(ctx) {
  return [
    { tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'proto:prototype', content: ctx.slug }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'proto:version', content: ctx.version }, injectTo: 'head' },
    {
      tag: 'script',
      attrs: { type: 'module', src: '/_shell/loader.js', 'data-proto-shell': '' },
      injectTo: 'body',
    },
  ];
}

/**
 * @param {{ slug: string, version: string, repoRoot: string }} ctx
 * @returns {import('vite').Plugin}
 */
export function protoShell(ctx) {
  const require = createRequire(import.meta.url);
  return {
    name: 'proto:shell',
    transformIndexHtml: {
      order: 'post',
      handler: () => shellTags(ctx),
    },
    // Dev server: serve the built shell and a live registry so the switcher works under `pnpm dev`.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        if (url === '/registry.json') {
          try {
            res.setHeader('Content-Type', 'application/json');
            res.end(serializeRegistry(buildRegistry(ctx.repoRoot)));
          } catch (err) {
            res.statusCode = 500;
            res.end(String(/** @type {Error} */ (err).message));
          }
          return;
        }
        if (url.startsWith('/_shell/')) {
          let shellDist;
          try {
            shellDist = join(dirname(require.resolve('@proto/proto-shell/package.json')), 'dist');
          } catch {
            shellDist = join(ctx.repoRoot, 'packages/proto-shell/dist');
          }
          const file = join(shellDist, basename(url));
          if (existsSync(file)) {
            res.setHeader('Content-Type', 'text/javascript');
            res.end(readFileSync(file));
            return;
          }
        }
        next();
      });
    },
  };
}

/** Fail the build when the output references a public CDN (ADR-0005). @returns {import('vite').Plugin} */
export function cdnGuard() {
  return {
    name: 'proto:cdn-guard',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [name, chunk] of Object.entries(bundle)) {
        const text =
          chunk.type === 'chunk' ? chunk.code : typeof chunk.source === 'string' ? chunk.source : null;
        const m = text && FORBIDDEN_CDN.exec(text);
        if (m)
          this.error(`${name} references a public CDN (${m[0]}). Copy the file into the version instead.`);
      }
    },
  };
}

/** Optimize emitted SVG assets with svgo. @returns {import('vite').Plugin} */
export function svgOptimize() {
  return {
    name: 'proto:svgo',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type !== 'asset' || !asset.fileName.endsWith('.svg')) continue;
        const source =
          typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source);
        asset.source = optimize(source, { multipass: true }).data;
      }
    },
  };
}

/**
 * Full Vite config for a prototype version.
 * @param {string} versionDir usually import.meta.dirname
 * @param {import('vite').UserConfig} [overrides] merged shallowly; plugins are appended
 * @returns {import('vite').UserConfig}
 */
export function defineVersionConfig(versionDir, overrides = {}) {
  const ctx = versionContext(versionDir);
  const { plugins = [], build = {}, ...rest } = overrides;
  return {
    root: resolve(versionDir),
    base: ctx.base,
    publicDir: 'assets',
    plugins: [protoShell(ctx), cdnGuard(), svgOptimize(), ...plugins],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsDir: 'assets',
      target: 'es2022',
      sourcemap: false,
      // three.js alone is ~700 kB; prototypes are not production apps.
      chunkSizeWarningLimit: 1500,
      ...build,
    },
    server: { host: '0.0.0.0', port: 5173, strictPort: false },
    preview: { host: '0.0.0.0' },
    ...rest,
  };
}
