// Web app manifest and home-screen icons for every prototype version (ADR-0019): «Add to Home Screen» on iPhone
// and Android opens the prototype full screen, like an app. Colours come from TUI tokens.
//   - icon: <version>/assets/app-icon.png|svg if present, else the TUI yellow square with the prototype initials;
//   - scope is the whole site, so the password login (/_auth/login) stays inside the app window.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BackgroundAccent1, BackgroundBase, TextPrimaryOnAccent1 } from '@proto/tokens';
import sharp from 'sharp';

export const PWA_DIR = 'pwa';
export const ICON_SIZES = /** @type {const} */ ([180, 192, 512]);
export const MANIFEST_FILE = 'manifest.webmanifest';

/** @param {string} file @returns {any} */
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});

/**
 * Names for the manifest from prototype.json and version.json.
 * @param {{ slug: string, version: string, repoRoot: string }} ctx
 */
export function appNames(ctx) {
  const protoDir = join(ctx.repoRoot, 'prototypes', ctx.slug);
  const title = String(readJson(join(protoDir, 'prototype.json')).title || ctx.slug).trim();
  return { name: `${title} · ${ctx.version}`, shortName: title };
}

/**
 * Up to two initials of a title: «Единая активация» → «ЕА», «checkout-flow» → «CF».
 * @param {string} title
 */
export function initials(title) {
  const words = title.split(/[\s\-_·.]+/u).filter((w) => /\p{L}|\p{N}/u.test(w));
  return words
    .slice(0, 2)
    .map((w) => [...w].find((c) => /\p{L}|\p{N}/u.test(c)) ?? '')
    .join('')
    .toUpperCase();
}

/** @param {string} s */
const escapeXml = (s) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Default icon: a full-bleed TUI yellow square (iOS rounds the corners itself) with the initials.
 * @param {string} title
 */
export function defaultIconSvg(title) {
  const text = escapeXml(initials(title) || 'P');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${BackgroundAccent1}"/>
<text x="256" y="256" dy="0.35em" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif"
 font-size="${text.length > 1 ? 200 : 240}" font-weight="700" fill="${TextPrimaryOnAccent1}">${text}</text>
</svg>`;
}

/**
 * @param {{ slug: string, version: string, base: string }} ctx
 * @param {{ name: string, shortName: string }} names
 */
export function manifest(ctx, names) {
  return {
    id: ctx.base,
    name: names.name,
    short_name: names.shortName,
    lang: 'ru',
    start_url: ctx.base,
    scope: '/',
    display: 'standalone',
    background_color: BackgroundBase,
    theme_color: BackgroundBase,
    icons: [192, 512].map((size) => ({
      src: `${ctx.base}${PWA_DIR}/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any',
    })),
  };
}

/**
 * Head tags; existing tags with the same name/rel in index.html win.
 * @param {{ base: string }} ctx
 * @param {{ shortName: string }} names
 * @param {string} html
 * @returns {import('vite').HtmlTagDescriptor[]}
 */
export function pwaTags(ctx, names, html) {
  /** @type {import('vite').HtmlTagDescriptor[]} */
  const tags = [
    {
      tag: 'link',
      // The site is password-protected: the manifest request must carry the session cookie.
      attrs: { rel: 'manifest', href: `${ctx.base}${MANIFEST_FILE}`, crossorigin: 'use-credentials' },
      injectTo: 'head',
    },
    {
      tag: 'link',
      attrs: { rel: 'apple-touch-icon', href: `${ctx.base}${PWA_DIR}/icon-180.png` },
      injectTo: 'head',
    },
    { tag: 'meta', attrs: { name: 'theme-color', content: BackgroundBase }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
    { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
    {
      tag: 'meta',
      attrs: { name: 'apple-mobile-web-app-title', content: names.shortName },
      injectTo: 'head',
    },
  ];
  return tags.filter((t) => {
    const key = t.attrs?.rel ? `rel="${t.attrs.rel}"` : `name="${t.attrs?.name}"`;
    return !html.includes(key);
  });
}

/**
 * PNG icons of every size from the version's own icon or the default one.
 * @param {string} versionDir
 * @param {string} title
 * @returns {Promise<Map<number, Buffer>>}
 */
export async function renderIcons(versionDir, title) {
  const own = ['app-icon.png', 'app-icon.svg'].map((f) => join(versionDir, 'assets', f)).find(existsSync);
  const source = own ? readFileSync(own) : Buffer.from(defaultIconSvg(title));
  /** @type {Map<number, Buffer>} */
  const out = new Map();
  for (const size of ICON_SIZES) {
    out.set(
      size,
      await sharp(source, { density: 300 })
        .resize(size, size, { fit: 'cover' })
        .flatten({ background: BackgroundBase })
        .png()
        .toBuffer(),
    );
  }
  return out;
}

/**
 * Vite plugin: emits the manifest and icons on build and injects the head tags.
 * @param {{ slug: string, version: string, repoRoot: string, base: string }} ctx
 * @param {string} versionDir
 * @returns {import('vite').Plugin}
 */
export function pwa(ctx, versionDir) {
  const names = appNames(ctx);
  return {
    name: 'proto:pwa',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: (html) => pwaTags(ctx, names, html) },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: MANIFEST_FILE,
        source: `${JSON.stringify(manifest(ctx, names), null, 2)}\n`,
      });
      for (const [size, png] of await renderIcons(versionDir, names.shortName)) {
        this.emitFile({ type: 'asset', fileName: `${PWA_DIR}/icon-${size}.png`, source: png });
      }
    },
  };
}
